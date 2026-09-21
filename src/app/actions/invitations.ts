'use server'

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export async function acceptInvitation(token: string) {
  const supabase = await createClient()

  // 1. Authenticate User
  const { data: { user }, error: dataError } = await supabase.auth.getUser()

  if (dataError || !user) {
    const nextPath = encodeURIComponent(`/accept-invite?token=${token}`)
    redirect(`/login?next=${nextPath}`)
  }

  // 2. Fetch Invitation + Join Tenant
  const { data: invite, error: inviteError } = await supabase
    .from('invitations')
    .select('*, tenants(slug, name)')
    .eq('token', token)
    .maybeSingle()

  if (inviteError || !invite) {
    return { error: 'Invalid or missing invitation link.' }
  }

  // 3. Validation Checks (Expiration, Re-use, Email Match)
  if (invite.accepted_at) {
    return { error: 'This invitation link has already been used.' }
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { error: 'This invitation link has expired.' }
  }

  if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
    return { 
      error: `This invite was sent to ${invite.email}. You are logged in as ${user.email}.` 
    }
  }

  // 4. Upsert Membership
  const { error: membershipError } = await supabase.from('memberships').upsert(
    {
      tenant_id: invite.tenant_id,
      user_id: user.id, 
      role: invite.role || 'member'
    }, 
    { onConflict: 'tenant_id, user_id' }
  )

  if (membershipError) {
    return { error: 'Failed to join the organization.' }
  }

  // 5. Mark Invitation as Accepted (Fixed column name)
  await supabase
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  // 6. Extract Tenant Slug safely (Fixed property name)
  const tenant = Array.isArray(invite.tenants) ? invite.tenants[0] : invite.tenants 
  const tenantSlug = tenant?.slug 

  // 7. Redirect to Dashboard
  if (tenantSlug) {
    redirect(`/org/${tenantSlug}/dashboard?success=invite-accepted`)
  }

  redirect('/dashboard')
}