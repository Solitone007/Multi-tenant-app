'use server'

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

/**
 * Helper to ensure redirect paths stay within the application domain.
 * Prevents malicious external open-redirects.
 */
function getSafeRedirectUrl(nextPath: string, fallback: string = '/select-tenant'): string {
  if (!nextPath || typeof nextPath !== 'string') return fallback
  
  // Decodes encoded path components (e.g. %2Faccept-invite -> /accept-invite)
  const decoded = decodeURIComponent(nextPath)
  
  // Ensure the route starts with a single slash and not double slashes (e.g. //evil.com)
  if (decoded.startsWith('/') && !decoded.startsWith('//')) {
    return decoded
  }
  
  return fallback
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = (formData.get('email') as string || "").trim().toLowerCase()
  const password = formData.get('password') as string || ""
  const nextRaw = formData.get('next') as string || ""
  const inviteToken = formData.get('inviteToken') as string || ""

  if (!email || !password) {
    const nextParam = nextRaw ? `&next=${encodeURIComponent(nextRaw)}` : ''
    redirect(`/login?mode=signup&error=${encodeURIComponent('Email and password are required.')}${nextParam}`)
  }

  // If an invitation token is provided during signup, verify target email address
  if (inviteToken) {
    const { data: invite } = await supabase
      .from('invitations')
      .select('email, expires_at, accepted_at')
      .eq('token', inviteToken)
      .maybeSingle()

    if (invite) {
      if (invite.accepted_at) {
        redirect(`/login?error=${encodeURIComponent('This invitation link has already been used.')}`)
      }
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        redirect(`/login?error=${encodeURIComponent('This invitation link has expired.')}`)
      }
      if (invite.email.toLowerCase() !== email) {
        const nextParam = nextRaw ? `&next=${encodeURIComponent(nextRaw)}` : ''
        redirect(
          `/login?mode=signup&inviteToken=${encodeURIComponent(inviteToken)}&error=${encodeURIComponent(
            `This invite was sent to ${invite.email}. Please sign up using that email address.`
          )}${nextParam}`
        )
      }
    }
  }

  const { error } = await supabase.auth.signUp({ 
    email, 
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/auth/callback`,
    }
  })

  if (error) {
    const nextParam = nextRaw ? `&next=${encodeURIComponent(nextRaw)}` : ''
    const inviteParam = inviteToken ? `&inviteToken=${encodeURIComponent(inviteToken)}` : ''
    redirect(`/login?mode=signup&error=${encodeURIComponent(error.message)}${nextParam}${inviteParam}`)
  }

  // Fallback to accept-invite page if inviteToken exists but next was omitted
  const fallbackPath = inviteToken ? `/accept-invite?token=${inviteToken}` : '/select-tenant'
  const targetPath = getSafeRedirectUrl(nextRaw, fallbackPath)
  
  redirect(targetPath)
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = (formData.get('email') as string || "").trim().toLowerCase()
  const password = formData.get('password') as string || ""
  const nextRaw = formData.get('next') as string || ""
  const inviteToken = formData.get('inviteToken') as string || ""

  if (!email || !password) {
    const nextParam = nextRaw ? `&next=${encodeURIComponent(nextRaw)}` : ''
    redirect(`/login?error=${encodeURIComponent('Email and password are required.')}${nextParam}`)
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    const nextParam = nextRaw ? `&next=${encodeURIComponent(nextRaw)}` : ''
    const inviteParam = inviteToken ? `&inviteToken=${encodeURIComponent(inviteToken)}` : ''
    redirect(`/login?error=${encodeURIComponent(error.message)}${nextParam}${inviteParam}`)
  }

  // Fallback to accept-invite page if inviteToken exists but next was omitted
  const fallbackPath = inviteToken ? `/accept-invite?token=${inviteToken}` : '/select-tenant'
  const targetPath = getSafeRedirectUrl(nextRaw, fallbackPath)
  
  redirect(targetPath)
}

export async function signout() {
  const supabase = await createClient()
  
  await supabase.auth.signOut()
  
  redirect('/login')
}