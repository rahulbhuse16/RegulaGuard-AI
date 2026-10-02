import { useState, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface TabItem {
  key: string
  label: string
  content: ReactNode
}

export function Tabs({ items, defaultKey }: { items: TabItem[]; defaultKey?: string }) {
  const [active, setActive] = useState(defaultKey ?? items[0]?.key)
  const activeItem = items.find((i) => i.key === active)

  return (
    <div>
      <div role="tablist" className="flex gap-1 border-b border-ink-100">
        {items.map((item) => (
          <button
            key={item.key}
            role="tab"
            aria-selected={active === item.key}
            onClick={() => setActive(item.key)}
            className={cn(
              'focus-ring border-b-2 px-3.5 py-2 text-sm font-medium',
              active === item.key ? 'border-brass-600 text-ink-950' : 'border-transparent text-slate-500 hover:text-ink-700',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="pt-4">{activeItem?.content}</div>
    </div>
  )
}
