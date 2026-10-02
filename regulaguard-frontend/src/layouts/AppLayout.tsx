import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, ShieldCheck } from 'lucide-react'
import { NAV } from './nav'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/utils/cn'
import { humanize } from '@/utils/format'

const BRAND = import.meta.env.VITE_PRODUCT_NAME ?? 'RegulaGuard AI'

export function AppLayout() {
  const { user, logout, hasRole } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto bg-ink-950 text-ink-100 md:flex">
        <Link to="/dashboard" className="focus-ring flex items-center gap-2 px-5 py-5">
          <ShieldCheck className="size-6 text-brass-100" />
          <div>
            <p className="font-serif text-lg font-semibold leading-tight text-vellum-50">{BRAND}</p>
            <p className="text-xs text-ink-300">Regulatory compliance intelligence</p>
          </div>
        </Link>
        <nav className="flex-1 px-3 pb-6">
          {NAV.map((group) => {
            const items = group.items.filter((i) => !i.roles || hasRole(...i.roles))
            if (items.length === 0) return null
            return (
              <div key={group.title} className="mt-4">
                <p className="px-2 pb-1 text-xs text-ink-300">{group.title}</p>
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/dashboard'}
                    className={({ isActive }) =>
                      cn(
                        'focus-ring flex items-center gap-2.5 rounded px-2 py-1.5 text-sm',
                        isActive ? 'bg-ink-700 text-vellum-50' : 'text-ink-100 hover:bg-ink-900',
                      )
                    }
                  >
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-ink-100 bg-white px-6 py-3">
          <p className="text-sm text-slate-500 md:hidden">{BRAND}</p>
          <div className="hidden md:block" />
          <div className="flex items-center gap-4">
            {user && (
              <div className="text-right">
                <p className="text-sm font-medium text-ink-900">{user.full_name}</p>
                <p className="text-xs text-slate-500">{humanize(user.role)}</p>
              </div>
            )}
            <button
              onClick={() => {
                logout()
                navigate('/')
              }}
              className="focus-ring flex items-center gap-1.5 rounded px-2 py-1.5 text-sm text-slate-600 hover:bg-vellum-100"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </header>
        <main className="flex-1 px-6 py-6 lg:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}