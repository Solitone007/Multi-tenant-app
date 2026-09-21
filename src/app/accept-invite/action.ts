'use server'

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export type AcceptInvitationResult = {
  error?: string
  redirectTo?: string
}

export async function acceptInvitation(token: string): Promise<AcceptInvitationResult> {
  if (!token?.trim()) {
    return { error: 'Invitation token is missing or invalid.' }
  }

  const supabase = await createClient()

  // 1. Verify Authentication Session
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const nextPath = encodeURIComponent(`/accept-invite?token=${token}`)
    const loginPath = `/login?next=${nextPath}&error=${encodeURIComponent('Please sign in or create an account to accept the invitation.')}`
    
    // Redirect unauthenticated users immediately to login
    redirect(loginPath)
  }

  // 2. Query Invitation Record with Tenant details
  const { data: invite, error: inviteError } = await supabase
    .from('invitations')
    .select('id, tenant_id, email, role, expires_at, accepted_at, tenants(slug)')
    .eq('token', token)
    .maybeSingle()

  if (inviteError || !invite) {
    return { error: 'Invalid or missing invitation token.' }
  }

  // 3. Assignment Check: Token Single-Use (Must not be accepted already)
  if (invite.accepted_at) {
    return { error: 'This invitation link has already been used.' }
  }

  // 4. Assignment Check: Token Expiration (7-day window check)
  if (new Date(invite.expires_at) < new Date()) {
    return { error: 'This invitation link has expired. Please ask the workspace owner for a new invite.' }
  }

  // 5. Assignment Check: Email Match Validation
  const loggedInEmail = user.email?.toLowerCase().trim()
  const invitedEmail = invite.email?.toLowerCase().trim()

  if (loggedInEmail !== invitedEmail) {
    return { 
      error: `This invitation was sent to ${invite.email}. Please sign in with that account to accept.` 
    }
  }

  // Safe extraction for tenant slug join
  const rawTenant = invite.tenants as unknown as { slug: string } | { slug: string }[] | null
  const tenant = Array.isArray(rawTenant) ? rawTenant[0] : rawTenant

  // 6. Insert Membership Record
  const { error: memberError } = await supabase
    .from('memberships')
    .upsert(
      {
        tenant_id: invite.tenant_id,
        user_id: user.id,
        role: invite.role || 'member'
      },
      { onConflict: 'tenant_id, user_id' }
    )

  if (memberError) {
    return { error: `Failed to join workspace: ${memberError.message}` }
  }

  // 7. Mark Invitation as Accepted (Single-Use enforcement flag)
  await supabase
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  // 8. Redirect to Tenant Dashboard
  const targetUrl = tenant?.slug 
    ? `/org/${tenant.slug}/dashboard?joined=true` 
    : '/select-tenant'

  return { redirectTo: targetUrl }
}