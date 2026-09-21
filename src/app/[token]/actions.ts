'use server'

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export async function acceptInvitation (token: string) {
  const supabase = await createClient()

  const { data: {user}} = await supabase.auth.getUser()
  if (!user) {
   const nextPath = encodeURIComponent(`/accept-invite?token=${token}`)
    redirect(`/login?next=${nextPath}&error=${encodeURIComponent('please sign in or create an account to accept invitation')}`)
  }

  const {data: invite, error: inviteError} = await supabase
  .from('invitations')
  .select('id, tenant_id, role, tenants(slug)')
  .eq('token', token)
  .maybeSingle()

  if (inviteError || !invite) {
    return {error: 'Invalid or Network issue'}
  }

  const tenant = Array.isArray(invite.tenants) ? invite.tenants[0] : invite.tenants 

  const {error: memberError} = await supabase.from('memberships').upsert({
    tenant_id: invite.tenant_id,
    user_id: user.id,
    role: invite.role || 'member'
  },
  {onConflict: 'tenant_id, user_id'}
)

if (memberError) {
  return {error: memberError.message}
}

await supabase.from('invitations').delete().eq('id', invite.id)

if (tenant?.slug) {
  redirect(`/org/${tenant.slug}/dashboard?joined=true`)
}

redirect('/select-tenant')

}