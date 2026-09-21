'use client'

import React, { ComponentPropsWithoutRef } from 'react'
import { useFormStatus } from 'react-dom'

interface SubmitButtonProps extends ComponentPropsWithoutRef<'button'> {
  children: React.ReactNode
  pendingText?: string
  className?: string
}

export function SubmitButton({
  children,
  pendingText = 'Processing...',
  className = '',
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus()
  const isDisabled = pending || disabled

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className={`inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {pending ? (
        <div className="flex items-center gap-2">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <span>{pendingText}</span>
        </div>
      ) : (
        children
      )}
    </button>
  )
}