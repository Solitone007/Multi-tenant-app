'use client'

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { acceptInvitation } from "./action"
import { SubmitButton } from "@/components/SubmitButton"
import { signout } from "@/app/action/auth"

interface InviteButtonProps {
  token: string
  disabled?: boolean
}

export default function InviteButton({ token, disabled = false }: InviteButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleAccept() {
    setError(null)

    startTransition(async () => {
      try {
        const res = await acceptInvitation(token)

        if (res?.error) {
          setError(res.error)
        } else if (res?.redirectTo) {
          router.push(res.redirectTo)
          router.refresh()
        }
      } catch (err: unknown) {
        // Next.js internal redirect exceptions should be ignored
        if (
          err && 
          typeof err === 'object' && 
          'digest' in err && 
          typeof (err as { digest?: string }).digest === 'string' && 
          (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
        ) {
          return
        }
        setError('An unexpected connection error occurred. Please try again.')
      }
    })
  }

  const isButtonDisabled = isPending || disabled

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Error Feedback Message */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 text-left">
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-200 text-[10px] font-bold text-red-800">
            !
          </span>
          <div>
            <p className="font-semibold text-red-800">Unable to accept invitation</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Primary Action Button */}
      <button
        type="button"
        onClick={handleAccept}
        disabled={isButtonDisabled}
        className="w-full cursor-pointer rounded-xl border border-blue-600 bg-blue-600 px-4 py-3 text-xs font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? (
          <div className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <span>Accepting Invitation...</span>
          </div>
        ) : (
          'Accept Invitation'
        )}
      </button>

      {/* Account Switcher Footer */}
      <div className="pt-2 text-center">
        <p className="mb-2 text-[11px] text-slate-500">
          Need to sign in with a different email address?
        </p>
        <form action={signout} className="w-full">
          <SubmitButton
            className="w-full cursor-pointer rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            Sign Out & Switch Account
          </SubmitButton>
        </form>
      </div>
    </div>
  )
}