'use server'

import { createClient } from "@/utils/supabase/server"
import crypto from 'crypto'
import { Resend } from 'resend'

// Initialize Resend conditionally if API key is configured
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export type CreateInvitationInput = {
  tenantId: string 
  email: string 
  role: string
}

export type CreateInvitationResult = 
  | { error: string; inviteUrl?: never; successEmail?: never }
  | { inviteUrl: string; successEmail: string; error?: never }

export async function createInvitation({
  tenantId, 
  email, 
  role
}: CreateInvitationInput): Promise<CreateInvitationResult> {
  const supabase = await createClient()

  // 1. Input Sanitization & Format Validation
  const standardEmail = email?.toLowerCase().trim()
  const rexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/ 

  if (!standardEmail || !rexEmail.test(standardEmail)) {
    return { error: 'Please enter a valid email address.' }
  }

  const validRoles = ['owner', 'admin', 'member']
  const sanitizedRole = role?.toLowerCase().trim() || 'member'
  if (!validRoles.includes(sanitizedRole)) {
    return { error: 'Invalid workspace role selected.' }
  }

  // 2. Authentication Check
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be authenticated to perform this action.' }
  }

  // 3. Authorization Check: Ensure Caller holds 'owner' or 'admin' membership
  const { data: callerMembership, error: errorMember } = await supabase
    .from('memberships')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (errorMember || !callerMembership) {
    return { error: 'You do not belong to this workspace.' }
  }

  if (!['owner', 'admin'].includes(callerMembership.role)) {
    return { error: 'You do not have administrative permissions to send invitations.' }
  }

  // 4. Check if Target User is Already an Active Workspace Member
  // Lookup profile or user ID associated with email, then verify membership
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', standardEmail)
    .maybeSingle()

  if (existingUser) {
    const { data: existingMembership } = await supabase
      .from('memberships')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', existingUser.id)
      .maybeSingle()

    if (existingMembership) {
      return { error: `${standardEmail} is already an active member of this workspace.` }
    }
  }

  // 5. Fetch Workspace Details for Contextual Emails
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', tenantId)
    .single()

  const tenantName = tenant?.name || 'the workspace'

  // 6. Delete Any Unaccepted Pending Invitation for same Email and Tenant
  await supabase
    .from('invitations')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('email', standardEmail)
    .is('accepted_at', null)

  // 7. Generate Token & 7-Day Expiration Date
  const token = crypto.randomUUID()
  const expireAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  // 8. Insert Invitation Record into Supabase Database
  const { error: insertError } = await supabase.from('invitations').insert({
    tenant_id: tenantId,
    email: standardEmail, 
    token,
    role: sanitizedRole,
    expires_at: expireAt, 
    invited_by: user.id
  })

  if (insertError) {
    if (insertError.code === '23505') {
      return { error: `An active invitation has already been sent to ${standardEmail}.` }
    }
    return { error: `Database error: ${insertError.message}` }
  }

  // 9. Build Base URL safely across Vercel, Netlify, and Local environments
  const getBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL.startsWith('http') 
        ? process.env.NEXT_PUBLIC_APP_URL 
        : `https://${process.env.NEXT_PUBLIC_APP_URL}`
    }
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`
    }
    return 'http://localhost:3000'
  }

  const objInvite = new URL('/accept-invite', getBaseUrl())
  objInvite.searchParams.set('token', token)
  const inviteUrl = objInvite.toString()

  // 10. Dispatch Invitation Email via Resend platform (if key is set)
  if (resend) {
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: standardEmail,
        subject: `You've been invited to join ${tenantName}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1e293b; max-width: 560px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0f172a; margin-top: 0;">Workspace Invitation</h2>
            <p>You have been invited to join <strong>${tenantName}</strong> as a <strong>${sanitizedRole}</strong>.</p>
            <div style="margin: 28px 0;">
              <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; font-weight: 600; text-decoration: none; border-radius: 8px;">
                Accept Invitation
              </a>
            </div>
            <p style="color: #64748b; font-size: 13px;">This invitation link will expire in 7 days.</p>
          </div>
        `,
      })
    } catch (emailErr) {
      console.error('Failed to dispatch invitation email via Resend:', emailErr)
    }
  }

  return {
    inviteUrl,
    successEmail: standardEmail
  }
}