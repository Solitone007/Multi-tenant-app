'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createWorkspace, type CreateWorkspaceResult } from './actions'
import { SubmitButton } from '@/components/SubmitButton'
import { signout } from "@/app/action/auth"

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function SelectTenantPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [isCustomSlug, setIsCustomSlug] = useState(false)

  // React 19 / Next.js 15 useActionState hook
  const [state, formAction, isPending] = useActionState<CreateWorkspaceResult | null, FormData>(
    async (_prevState, formData) => {
      return await createWorkspace(formData)
    },
    null
  )

  // Handle client-side redirect when server action returns redirectTo
  useEffect(() => {
    if (state?.redirectTo) {
      router.push(state.redirectTo)
      router.refresh()
    }
  }, [state, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        
        {/* Header with Title, Description, and Sign Out */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Create Workspace
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Set up a new organization workspace to get started.
            </p>
          </div>

          <form action={signout}>
            <SubmitButton className="shrink-0 cursor-pointer rounded-lg bg-red-700 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-800 focus:outline-none ">
              Sign Out
            </SubmitButton>
          </form>
        </div>

        {/* Display Error Message from Server Action */}
        {state?.error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-200 text-[10px] font-bold text-red-800">
              !
            </span>
            <div>
              <p className="font-semibold text-red-800">Creation Failed</p>
              <p className="mt-0.5 text-red-700">{state.error}</p>
            </div>
          </div>
        )}

        {/* Create Workspace Form */}
        <form action={formAction} className="space-y-4">
          {/* Workspace Name Input */}
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-gray-700">
              Workspace Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={name}
              onChange={(e) => {
                const newName = e.target.value
                setName(newName)
                if (!isCustomSlug) {
                  setSlug(slugify(newName))
                }
              }}
              placeholder="Acme Corp"
              className="w-full rounded-xl border border-blue-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-gray-800 transition focus:border-blue-500  focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Workspace Slug Input */}  
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="slug" className="block text-sm font-semibold text-gray-700">
                Workspace URL Identifier
              </label>
              {isCustomSlug && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomSlug(false)
                    setSlug(slugify(name))
                  }}
                  className="text-[11px] text-blue-600 hover:underline focus:outline-none"
                >
                  Reset to Auto
                </button>
              )}
            </div>
            <input
              type="text"
              id="slug"
              name="slug"
              required
              value={slug}
              onChange={(e) => {
                setIsCustomSlug(true)
                setSlug(slugify(e.target.value))
              }}
              placeholder="acme-corp"
              className="w-full rounded-xl border border-blue-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-gray-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {slug && (
              <p className="mt-2 text-[11px] text-slate-500">
                Preview Route: <span className="font-mono text-blue-600 font-medium">/org/{slug}/dashboard</span>
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <SubmitButton
              disabled={isPending}
              className="w-full cursor-pointer rounded-xl bg-blue-600 py-3 text-xs font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <div className="flex items-center justify-center gap-2.5">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Creating workspace...</span>
                </div>
              ) : (
                'Create Workspace & Continue'
              )}
            </SubmitButton>
          </div>
        </form>

      </div>
    </div>
  )
}