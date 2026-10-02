import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, error, className, id, children, ...props }, ref) => {
  const selectId = id ?? props.name
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-ink-700">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full appearance-none rounded-[var(--radius-card)] border border-ink-100 bg-white px-3 py-2 pr-8 text-sm text-ink-900',
            'focus-ring',
            error && 'border-crimson-700',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
      </div>
      {error && <span className="text-xs text-crimson-700">{error}</span>}
    </div>
  )
})
Select.displayName = 'Select'
