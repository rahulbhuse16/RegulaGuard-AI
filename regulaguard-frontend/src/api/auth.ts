import { api, tokenStore } from './client'
import type { Role } from '@/types/enums'
import type { TokenResponse, User } from '@/types/api'

export interface RegisterPayload {
  organization_name: string
  email: string
  full_name: string
  password: string
  role: Role
}

export interface LoginPayload {
  email: string
  password: string
}

export async function register(payload: RegisterPayload): Promise<User> {
  const res = await api.post<User>('/auth/register', payload)
  return res.data
}

export async function login(payload: LoginPayload): Promise<TokenResponse> {
  const res = await api.post<TokenResponse>('/auth/login', payload)
  tokenStore.set(res.data)
  return res.data
}

export async function me(): Promise<User> {
  const res = await api.get<User>('/auth/me')
  return res.data
}

export function logout() {
  tokenStore.clear()
}
