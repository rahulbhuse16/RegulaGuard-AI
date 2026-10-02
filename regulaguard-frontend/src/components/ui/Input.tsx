import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, hint, className, id, ...props }, ref) => {
  const inputId = id ?? props.name
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink-700">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'rounded-[var(--radius-card)] border border-ink-100 bg-white px-3 py-2 text-sm text-ink-900',
          'placeholder:text-slate-400 focus-ring',
          error && 'border-crimson-700',
          className,
        )}
        {...props}
      />
      {hint && !error && <span className="text-xs text-slate-400">{hint}</span>}
      {error && <span className="text-xs text-crimson-700">{error}</span>}
    </div>
  )
})
Input.displayName = 'Input'
