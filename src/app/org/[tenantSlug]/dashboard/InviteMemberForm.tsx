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
        setSuccessMessage(`An invitation has been sent to ${email}`)
        setEmail('')
      }
    } catch (err) {
      console.error("Invitation failed:", err)
      setError('An error occurred. Please try again later.')
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
      setError('Failed to sign out. Please check your network connection.')
      setSigningOut(false)
    }
  } 

  async function handleClipBoard(text: string) {
    if (!navigator?.clipboard) {
      setError('Clipboard operations are not supported in this browser.')
      return
    }

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (err) {
      setError('Failed to copy to clipboard.')
    }
  }

 
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Header Container with Title & Sign Out Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Invite a Member</h2>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="cursor-pointer disabled:cursor-out-allowed rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 focus:outline-none disabled:opacity-50"
        >
          {signingOut ? 'Signing Out...' : 'Sign Out'}
        </button>
      </div>

      {/* Persistent Error Notification */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-200 font-bold text-red-800">
            !
          </span>
          <div>
            <p className="font-semibold text-red-800">Invitation Failed</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Persistent Success Notification */}
      {successMessage && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-200 font-bold text-emerald-800">
            ✓
          </span>
          <div>
            <p className="font-semibold text-emerald-900">Success!</p>
            <p className="mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Generated Invite Link Banner */}
      {inviteUrl && (
        <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-900">
          <p className="font-semibold text-emerald-800">Shareable Invite Link:</p>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="w-full rounded border border-emerald-300 bg-white px-2 py-1 text-xs text-gray-800 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => handleClipBoard(inviteUrl)}
              className="cursor-pointer rounded bg-emerald-700 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-800"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="invite-email" className="mb-1 block text-xs font-semibold text-gray-700">
          Email Address
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
          placeholder="colleague@gmail.com"
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
            error
              ? 'border-red-400 bg-red-50/30 focus:border-red-500'
              : 'border-gray-200 bg-blue-50/50 focus:border-blue-500'
          }`}
        />
      </div>

      <div>
        <label htmlFor="invite-role" className="mb-1 block text-xs font-semibold text-gray-700">
          Role
        </label>
        <select
          id="invite-role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full disabled:cursor-not-allowed cursor-pointer rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? 'Generating...' : 'Generate Invite Link'}
      </button>
    </form>
  )
}




