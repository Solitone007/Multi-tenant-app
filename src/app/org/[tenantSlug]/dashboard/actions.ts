'use server'

import { createClient } from "@/utils/supabase/server"
import crypto from 'crypto'

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

  // 1. Input sanitization & validation
  const standardEmail = email?.toLowerCase().trim()
  const rexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/ 

  if (!standardEmail || !rexEmail.test(standardEmail)) {
    return { error: 'Please enter a valid email address.' }
  }

  // 2. Authentication check
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated.' }
  }

  // 3. Authorization check (FIXED: Added .eq('user_id', user.id))
  const { data: memberships, error: ErrorMember } = await supabase
    .from('memberships')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .single()

  if (!memberships || ErrorMember) {
    return { error: 'You do not belong to this workspace.' }
  }

  if (!['owner', 'admin'].includes(memberships.role)) {
    return { error: 'You do not have permission to invite members.' }
  }

  // 4. Token & Expiration Generation
  const token = crypto.randomUUID()
  const expireAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  // 5. Database Insert
  const { error } = await supabase.from('invitations').insert({
    tenant_id: tenantId,
    email: standardEmail, 
    token,
    role,
    expires_at: expireAt, 
    invited_by: user.id
  })

  if (error) {
    if (error.code === '23505') {
      return { error: `An invitation has already been sent to ${standardEmail}.` }
    }
    return { error: error.message }
  }

  // 6. URL Construction
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const objInvite = new URL('/accept-invite', origin)
  objInvite.searchParams.set('token', token)

  return {
    inviteUrl: objInvite.toString(),
    successEmail: standardEmail
  }
}