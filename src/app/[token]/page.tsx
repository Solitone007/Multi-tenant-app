'use client'

import { useState, useTransition } from "react"
import { acceptInvitation } from "./actions"
import { SubmitButton } from "@/components/SubmitButton"
import { signout } from "@/app/action/auth"

export default function InviteButton({ token }: { token: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleAccept() {
    setError(null)

    startTransition(async () => {
      try {
        const res = await acceptInvitation(token)
        if (res?.error) {
          setError(res.error)
        }
      } catch (err) {
        setError('An unexpected connection error occurred. Please try again.')
      }
    })
  }

  return (
    <>
      <div className="space-y-3 flex flex-col items-center justify-center">
        {error && (
          <div className="w-full max-w-lg rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleAccept}
          disabled={isPending}
          className="w-full max-w-lg cursor-pointer rounded-lg border border-blue-100 bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition duration-200 ease-in-out hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <div className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Processing...</span>
            </div>
          ) : (
            'Accept Invitation'
          )}
        </button>
      </div>

      <div className="mt-3 text-center text-xs text-gray-500">
        <form action={signout} className="w-full max-w-lg mx-auto">
          <SubmitButton
            className="w-full !bg-red-800 !text-white !text-sm hover:!bg-red-900 !cursor-pointer !px-5 !py-2"
          >
            Sign Out & Switch Account
          </SubmitButton>
        </form>
      </div>
    </>
  )
}