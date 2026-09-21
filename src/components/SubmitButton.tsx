'use client'

import { useFormStatus } from 'react-dom'

interface SubmitButtonProps {
  children: React.ReactNode
  className?: string
}

export function SubmitButton({ children, className = '' }: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-lg font-semibold text-white transition-all hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
    >
      {pending ? (
        <div className="flex items-center gap-2">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <span>Processing...</span>
        </div>
      ) : (
        children
      )}
    </button>
  )
}