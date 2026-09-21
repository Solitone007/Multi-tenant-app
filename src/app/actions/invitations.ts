'use server'

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export type AcceptInvitationResult = {
  error?: string
  redirectTo?: string
}

export async function acceptInvitation(token: string): Promise<AcceptInvitationResult> {
  const sanitizedToken = token?.trim()

  if (!sanitizedToken) {
    return { error: 'Invalid or missing invitation token.' }
  }

  const supabase = await createClient()

  // 1. Authenticate User Session
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    const nextPath = encodeURIComponent(`/accept-invite?token=${sanitizedToken}`)
    redirect(`/login?next=${nextPath}&error=${encodeURIComponent('Please sign in to accept the workspace invitation.')}`)
  }

  // 2. Fetch Invitation & Related Tenant Record
  const { data: invite, error: inviteError } = await supabase
    .from('invitations')
    .select('id, tenant_id, email, role, accepted_at, expires_at, tenants(slug, name)')
    .eq('token', sanitizedToken)
    .maybeSingle()

  if (inviteError || !invite) {
    return { error: 'Invitation link not found or invalid.' }
  }

  // 3. Validation Checks (Single-use, Expiration, Email Match)
  if (invite.accepted_at) {
    return { error: 'This invitation link has already been used.' }
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { error: 'This invitation link has expired. Please ask the workspace owner for a new invite.' }
  }

  const loggedInEmail = user.email?.toLowerCase().trim()
  const invitedEmail = invite.email?.toLowerCase().trim()

  if (loggedInEmail !== invitedEmail) {
    return { 
      error: `This invitation was sent to ${invite.email}. You are currently logged in as ${user.email}.` 
    }
  }

  // 4. Create Membership Record
  const { error: membershipError } = await supabase
    .from('memberships')
    .upsert(
      {
        tenant_id: invite.tenant_id,
        user_id: user.id, 
        role: invite.role || 'member'
      }, 
      { onConflict: 'tenant_id, user_id' }
    )

  if (membershipError) {
    console.error("❌ Membership creation error:", membershipError)
    return { error: `Failed to join organization: ${membershipError.message}` }
  }

  // 5. Mark Invitation as Accepted (Enforces single-use)
  const { error: updateInviteError } = await supabase
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  if (updateInviteError) {
    console.error("⚠️ Invitation status update error:", updateInviteError)
  }

  // 6. Resolve Tenant Slug safely across Supabase join formats
  const rawTenant = invite.tenants
  const tenant = Array.isArray(rawTenant) ? rawTenant[0] : rawTenant
  const tenantSlug = tenant && typeof tenant === 'object' && 'slug' in tenant ? tenant.slug : null

  // 7. Return target route for client component router
  const targetPath = tenantSlug 
    ? `/org/${tenantSlug}/dashboard?success=invite-accepted` 
    : '/select-tenant'

  return { redirectTo: targetPath }
}