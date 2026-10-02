import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import * as authApi from '@/api/auth'
import { tokenStore } from '@/api/client'
import type { Role } from '@/types/enums'
import type { User } from '@/types/api'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: authApi.RegisterPayload) => Promise<void>
  logout: () => void
  hasRole: (...roles: Role[]) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const bootstrap = async () => {
      if (tokenStore.getAccess()) {
        try {
          const currentUser = await authApi.me()
          setUser(currentUser)
        } catch {
          tokenStore.clear()
        }
      }
      setIsLoading(false)
    }
    void bootstrap()
  }, [])

  const login = async (email: string, password: string) => {
    await authApi.login({ email, password })
    const currentUser = await authApi.me()
    setUser(currentUser)
  }

  const register = async (payload: authApi.RegisterPayload) => {
    await authApi.register(payload)
    await login(payload.email, payload.password)
  }

  const logout = () => {
    authApi.logout()
    setUser(null)
  }

  const hasRole = (...roles: Role[]) => !!user && roles.includes(user.role)

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, register, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
