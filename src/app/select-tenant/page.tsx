'use client'

import { useActionState } from 'react'
import { createWorkspace } from './actions'
import { SubmitButton } from '@/components/SubmitButton'

export default function SelectTenantPage() {
  const [state, formAction] = useActionState(
    async (_prevState: { error?: string } | null, formData: FormData) => {
      return await createWorkspace(formData)
    },
    null
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Workspace</h1>
          <p className="mt-1 text-sm text-gray-500">
            Set up a new organization workspace to get started.
          </p>
        </div>

        {/* Display Error Message from Server Action */}
        {state?.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Workspace Name
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="Acme Corp"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Workspace Slug
            </label>
            <input
              type="text"
              name="slug"
              required
              placeholder="acme-corp"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <SubmitButton
          
            className="w-full cursor-pointer rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Create Workspace
          </SubmitButton>
        </form>
      </div>
    </div>
  )
}