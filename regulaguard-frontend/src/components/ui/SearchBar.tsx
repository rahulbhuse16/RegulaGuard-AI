import { Search } from 'lucide-react'

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="focus-ring w-full rounded-[var(--radius-card)] border border-ink-100 bg-white py-2 pl-9 pr-3 text-sm text-ink-900 placeholder:text-slate-400"
      />
    </div>
  )
}
