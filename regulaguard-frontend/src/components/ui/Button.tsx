import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  isLoading?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-ink-900 text-vellum-50 hover:bg-ink-700 disabled:bg-ink-300',
  secondary: 'bg-transparent text-ink-900 border border-ink-300 hover:bg-vellum-100',
  ghost: 'bg-transparent text-slate-600 hover:bg-vellum-100 hover:text-ink-900',
  danger: 'bg-crimson-700 text-vellum-50 hover:bg-crimson-700/90',
}

const sizeClasses: Record<Size, string> = {
  sm: 'text-xs px-2.5 py-1.5 gap-1.5',
  md: 'text-sm px-3.5 py-2 gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-[var(--radius-card)] transition-colors focus-ring disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {isLoading && <Loader2 className="size-3.5 animate-spin" />}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
