'use server'

import { createClient } from "@/utils/supabase/server"
import crypto from 'crypto'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export type InviteUserState = {
  error?: string 
  success?: boolean 
  message?: string 
  inviteUrl?: string
} | null 

export async function SendInviteUser(
  _prevState: InviteUserState, 
  formData: FormData
): Promise<InviteUserState> {
  const supabase = await createClient()

  const email = formData.get('email')?.toString().toLowerCase().trim()
  const role = formData.get('role')?.toString().trim() || 'member'
  const tenantSlug = formData.get('tenantSlug')?.toString().trim()

  if (!email || !tenantSlug) {
    return { error: 'Please provide both a valid email address and workspace slug.' }
  }

  // 1. Authenticate Sender Session
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to send workspace invitations.' }
  }

  // 2. Fetch Target Tenant Details
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, name, slug')
    .eq('slug', tenantSlug)
    .single()

  if (tenantError || !tenant) {
    return { error: 'Workspace not found.' }
  }

  // 3. Verify Sender's Membership & Permission
  const { data: senderMembership } = await supabase
    .from('memberships')
    .select('id, role')
    .eq('tenant_id', tenant.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!senderMembership) {
    return { error: 'You are not a member of this workspace.' }
  }

  // Enforce role-based access control (Only admin/owner can invite if restricted)
  if (senderMembership.role !== 'owner' && senderMembership.role !== 'admin') {
    return { error: 'You do not have administrative permissions to invite new members.' }
  }

  // 4. Remove Existing Pending Unaccepted Invitations for Same Email + Tenant
  await supabase
    .from('invitations')
    .delete()
    .eq('tenant_id', tenant.id)
    .eq('email', email)
    .is('accepted_at', null)

  // 5. Generate Unique Token & Set 7-Day Expiration Date
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  // 6. Insert New Invitation Record
  const { error: inviteError } = await supabase
    .from('invitations')
    .insert({
      tenant_id: tenant.id,
      invited_by: user.id,
      role: role,
      email: email,
      token: token,
      expires_at: expiresAt,
    })

  if (inviteError) {
    return { error: `Failed to create invitation: ${inviteError.message}` }
  }

  // 7. Resolve Base URL reliably for Local, Vercel, or Custom Domains
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

  const inviteUrlObj = new URL('/accept-invite', getBaseUrl())
  inviteUrlObj.searchParams.set('token', token)
  const inviteUrl = inviteUrlObj.toString()

  // 8. Dispatch Email via Resend Integration
  if (resend) {
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: email,
        subject: `You've been invited to join ${tenant.name}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #2563eb;">Workspace Invitation</h2>
            <p>You have been invited to join <strong>${tenant.name}</strong> as a <strong>${role}</strong>.</p>
            <p style="margin: 24px 0;">
              <a href="${inviteUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Accept Invitation
              </a>
            </p>
            <p style="font-size: 12px; color: #666;">This invitation link will expire in 7 days.</p>
          </div>
        `,
      })
    } catch (emailErr) {
      console.error('Failed to dispatch invite email via Resend:', emailErr)
      return {
        success: true,
        message: `Invitation link generated for ${email}, but automated email delivery failed. You can copy the link below manually.`,
        inviteUrl,
      }
    }
  }

  return {
    success: true,
    message: `Invitation successfully sent to ${email}.`,
    inviteUrl,
  }
}