'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createWorkspace } from "./actions"

export default function CreateWorkSpaceForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [isCustomSlug, setIsCustomSlug] = useState(false)

  // Local helper for real-time live slug preview sync
  function slugify(text: string): string {
    return text 
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('slug', slug)

      const res = await createWorkspace(formData)

      if (res?.error) {
        setError(res.error)
        setLoading(false)
      } else if (res?.redirectTo) {
        router.push(res.redirectTo)
        router.refresh()
      } else {
        setLoading(false)
      }
    } catch (err) {
      console.error("Workspace creation failed:", err)
      setError("An unexpected error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Create Workspace
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Set up your organization workspace to get started.
        </p>
      </div>

      {/* Error Alert Box */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700">
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-200 font-bold text-red-800">
            !
          </span>
          <div>
            <p className="font-semibold text-red-800">Creation Failed</p>
            <p className="mt-0.5 text-red-700">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Workspace Name Input */}
        <div>
          <label htmlFor="name" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Organization Name
          </label>
          <input 
            type="text"
            id="name"
            required
            value={name}
            onChange={(e) => {
              const newName = e.target.value
              setName(newName)
              if (error) setError(null)
              
              // Auto-sync slug if the user hasn't explicitly unlinked custom editing
              if (!isCustomSlug) {
                setSlug(slugify(newName))
              }
            }}
            placeholder="Acme Corp"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Workspace Slug Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="slug" className="block text-xs font-semibold text-slate-700">
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
            required
            value={slug}
            onChange={(e) => {
              setIsCustomSlug(true)
              setSlug(slugify(e.target.value))
              if (error) setError(null)
            }}
            placeholder="acme-corp"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {slug && (
            <p className="mt-2 text-[11px] text-slate-500">
              Preview Route: <span className="font-mono text-blue-600 font-medium">/org/{slug}/dashboard</span>
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button 
            type="submit"
            disabled={loading}
            className="w-full cursor-pointer rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2.5">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Creating workspace...</span>
              </div>
            ) : (
              'Create Workspace & Continue'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}