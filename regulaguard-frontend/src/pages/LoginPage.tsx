import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ApiError } from '@/api/client'
import type { Role } from '@/types/enums'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
})
const registerSchema = loginSchema.extend({
  full_name: z.string().min(2, 'Enter your full name'),
  organization_name: z.string().min(2, 'Enter your organization'),
  password: z.string().min(8, 'Use at least 8 characters'),
  role: z.enum(['COMPLIANCE_ANALYST', 'COMPLIANCE_MANAGER', 'AUDITOR', 'ADMIN']),
})

type LoginValues = z.infer<typeof loginSchema>
type RegisterValues = z.infer<typeof registerSchema>

const BRAND = import.meta.env.VITE_PRODUCT_NAME ?? 'RegulaGuard AI'

export default function LoginPage() {
  const { login, register: registerUser, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [serverError, setServerError] = useState<string | null>(null)

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })
  const registerForm = useForm<RegisterValues>({ resolver: zodResolver(registerSchema), defaultValues: { role: 'COMPLIANCE_ANALYST' } })

  if (isAuthenticated) return <Navigate to="/" replace />

  const handleError = (err: unknown) => {
    if (err instanceof ApiError) {
      setServerError(err.isNetworkError ? 'Could not reach the server. Check that the backend is running.' : err.message)
    } else {
      setServerError('Something went wrong. Try again.')
    }
  }

  const onLogin = loginForm.handleSubmit(async (v) => {
    setServerError(null)
    try {
      await login(v.email, v.password)
      navigate('/')
    } catch (e) {
      handleError(e)
    }
  })

  const onRegister = registerForm.handleSubmit(async (v) => {
    setServerError(null)
    try {
      await registerUser({ ...v, role: v.role as Role })
      navigate('/')
    } catch (e) {
      handleError(e)
    }
  })

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-ink-950 p-12 text-ink-100 md:flex">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-7 text-brass-100" />
          <span className="font-serif text-xl font-semibold text-vellum-50">{BRAND}</span>
        </div>
        <div>
          <h1 className="font-serif text-4xl font-semibold leading-tight text-vellum-50">
            From regulation to remediation, with every step traceable.
          </h1>
          <p className="mt-4 max-w-md text-ink-300">
            Regulation, obligation, control, evidence, gap, risk, remediation. Each AI conclusion links back to its source and waits for human review.
          </p>
        </div>
        <p className="text-sm text-ink-300">AI output is decision support and is not legal advice.</p>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h2 className="font-serif text-2xl font-semibold text-ink-950">{mode === 'login' ? 'Sign in' : 'Create your account'}</h2>
          <p className="mb-6 mt-1 text-sm text-slate-500">
            {mode === 'login' ? 'Use your work email to continue.' : 'The organization is created if it does not exist yet.'}
          </p>

          {serverError && (
            <div role="alert" className="mb-4 rounded-[var(--radius-card)] border border-crimson-100 bg-crimson-100/40 px-3 py-2 text-sm text-crimson-700">
              {serverError}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={onLogin} className="space-y-4">
              <Input label="Email" type="email" autoComplete="email" {...loginForm.register('email')} error={loginForm.formState.errors.email?.message} />
              <Input label="Password" type="password" autoComplete="current-password" {...loginForm.register('password')} error={loginForm.formState.errors.password?.message} />
              <Button type="submit" className="w-full" isLoading={loginForm.formState.isSubmitting}>Sign in</Button>
            </form>
          ) : (
            <form onSubmit={onRegister} className="space-y-4">
              <Input label="Full name" {...registerForm.register('full_name')} error={registerForm.formState.errors.full_name?.message} />
              <Input label="Organization" {...registerForm.register('organization_name')} error={registerForm.formState.errors.organization_name?.message} />
              <Input label="Email" type="email" {...registerForm.register('email')} error={registerForm.formState.errors.email?.message} />
              <Input label="Password" type="password" autoComplete="new-password" {...registerForm.register('password')} error={registerForm.formState.errors.password?.message} />
              <Select label="Role" {...registerForm.register('role')}>
                <option value="COMPLIANCE_ANALYST">Compliance analyst</option>
                <option value="COMPLIANCE_MANAGER">Compliance manager</option>
                <option value="AUDITOR">Auditor</option>
                <option value="ADMIN">Administrator</option>
              </Select>
              <Button type="submit" className="w-full" isLoading={registerForm.formState.isSubmitting}>Create account</Button>
            </form>
          )}

          <button
            className="focus-ring mt-5 text-sm text-brass-700 hover:text-brass-600"
            onClick={() => { setServerError(null); setMode(mode === 'login' ? 'register' : 'login') }}
          >
            {mode === 'login' ? 'Need an account? Register' : 'Already registered? Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
