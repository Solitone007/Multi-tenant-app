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

  function slugify(text: string) {
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

    const formData = new FormData()
    formData.append('name', name)
    formData.append('slug', slug)

    const res = await createWorkspace(formData)

    if (res?.error) {
      setError(res.error)
      setLoading(false)
    }
    // Safe property check using "in" operator for TypeScript type-checking
    else if (res && 'redirectTo' in res && res.redirectTo) {
      router.push(res.redirectTo as string)
      setLoading(false)
      router.refresh()
    } else {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-gray-700 text-xl font-bold tracking-wider">Create Workspace</h2>
      <p className="text-sm text-gray-500 mt-1">
        Setup your organisation workspace to continue
      </p>

      {error && (
        <div className="rounded-xl text-red-700 bg-red-50 border border-red-200 py-3 px-2 text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="text-gray-500 text-xs font-semibold mb-1 block">Organisation Name</label>
        <input 
          type="text"
          id="name"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setSlug(slugify(e.target.value))
          }}
          placeholder="Acme Corp"
          className="w-full rounded-xl border border-gray-300 py-2.5 px-3 focus:outline-none focus:border-blue-400 text-xs"
        />
      </div>

      <div>
        <label htmlFor="slug" className="text-gray-500 text-xs font-semibold mb-1 block">Slug URL</label>
        <input 
          type="text"
          id="slug"
          required
          value={slug}
          onChange={(e) => {
            setSlug(slugify(e.target.value))
          }}
          placeholder="acme-corp"
          className="w-full rounded-xl border border-gray-300 py-2.5 px-3 focus:outline-none focus:border-blue-400 text-xs"
        />
          
        <button 
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm w-full px-3 py-3 mt-4 text-white font-semibold">
          {loading ? (
            <div className="flex items-center justify-center gap-3">
              <span className="h-4 w-4 border-white border-2 border-t-transparent animate-spin rounded-full"/>
              <span className="text-sm text-white">Creating workspace...</span>
            </div>
          ) : 'Continue to Workspace'}
        </button>
      </div>
    </form>
  )
}