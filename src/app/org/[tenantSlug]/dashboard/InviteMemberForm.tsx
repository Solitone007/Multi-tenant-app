'use client'

import { createClient } from "@/utils/supabase/client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createInvitation } from "./actions"

interface InviteMemberFormProps {
  tenantId: string 
  inviteUrlProp?: string 
}

export default function InviteMemberForm({ tenantId, inviteUrlProp }: InviteMemberFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null) 
  const [inviteUrl, setInviteUrl] = useState<string | null>(inviteUrlProp || null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      const res = await createInvitation({ tenantId, role, email })
      
      if (res.error) {
        setError(res.error)
      } else if (res.inviteUrl) {
        setInviteUrl(res.inviteUrl)
        setSuccessMessage(`An invitation link was generated for ${res.successEmail || email}.`)
        setEmail('')
      }
    } catch (err) {
      console.error("Invitation dispatch failed:", err)
      setError('An unexpected connection error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSignOut() {
    setError(null)
    setSigningOut(true)

    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      router.push('/login')
      router.refresh()
    } catch (err) {
      console.error("Sign out failed:", err)
      setError('Failed to sign out. Please check your network connection.')
      setSigningOut(false)
    }
  } 

  async function handleClipBoard(text: string) {
    try {
      if (navigator?.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        // Fallback for non-secure contexts or older browsers
        const textArea = document.createElement("textarea")
        textArea.value = text
        textArea.style.position = "fixed"
        textArea.style.left = "-999999px"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }

      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (err) {
      console.error("Clipboard copy failed:", err)
      setError('Failed to copy invitation link to clipboard.')
    }
  }

  return (
    <div className="w-full space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header Container */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 text-xl">Invite Team Member</h2>
          <p className="text-sm text-gray-500">Send an email invite or generate a shareable URL.</p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="cursor-pointer rounded-xl border border-slate-200 bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {signingOut ? 'Signing Out...' : 'Sign Out'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Feedback Banner */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-200 font-bold text-red-800">
              !
            </span>
            <div>
              <p className="font-semibold text-red-800">Unable to Send Invite</p>
              <p className="mt-0.5 text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-200 font-bold text-emerald-800">
              ✓
            </span>
            <div>
              <p className="font-semibold text-emerald-900">Invite Created</p>
              <p className="mt-0.5 text-emerald-800">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Generated Shareable Invite Link Banner */}
        {inviteUrl && (
          <div className="space-y-2 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 text-sm text-emerald-900">
            <p className="font-semibold text-emerald-800">Shareable Invitation Link:</p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleClipBoard(inviteUrl)}
                className="shrink-0 cursor-pointer rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-1"
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        )}

        {/* Email Field Input */}
        <div>
          <label htmlFor="invite-email" className="mb-1 block text-sm font-semibold text-gray-700">
            Recipient Email Address
          </label>
          <input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (error) setError(null)
            }}
            placeholder="colleague@company.com"
            className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-800 transition focus:outline-none focus:ring-2 ${
              error
                ? 'border-red-300 bg-red-50/20 focus:border-red-500 focus:ring-red-200'
                : 'border-slate-200 bg-slate-50/50 focus:border-blue-500 focus:ring-blue-200'
            }`}
          />
        </div>

        {/* Member Role Selection */}
        <div>
          <label htmlFor="invite-role" className="mb-1 block text-xs font-semibold text-slate-700">
            Assigned Role
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* Submit Action Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full cursor-pointer rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Generating Invitation...' : 'Send Invitation'}
        </button>
      </form>
    </div>
  )
}