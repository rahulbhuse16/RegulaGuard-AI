import axios, { AxiosError, type AxiosInstance } from 'axios'
import type { ApiErrorBody, TokenResponse } from '@/types/api'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

const ACCESS_TOKEN_KEY = 'regulaguard.access_token'
const REFRESH_TOKEN_KEY = 'regulaguard.refresh_token'

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  set: (tokens: TokenResponse) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token)
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },
}

/**
 * Normalized client-side error. Every thrown error from an API call is
 * shaped like this so components never have to sniff axios internals.
 */
export class ApiError extends Error {
  code: string
  status: number | null
  requestId: string | null
  details: Record<string, unknown> | null

  constructor(message: string, code: string, status: number | null, requestId: string | null, details: Record<string, unknown> | null) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.requestId = requestId
    this.details = details
  }

  /** True for the specific case a component might want to react to differently: no network reached the server at all. */
  get isNetworkError() {
    return this.status === null
  }
}

export const api: AxiosInstance = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshInFlight: Promise<string | null> | null = null

async function tryRefresh(): Promise<string | null> {
  const refresh = tokenStore.getRefresh()
  if (!refresh) return null
  if (!refreshInFlight) {
    refreshInFlight = axios
      .post<TokenResponse>(`${BASE_URL}/auth/refresh`, null, { params: { refresh_token: refresh } })
      .then((res) => {
        tokenStore.set(res.data)
        return res.data.access_token
      })
      .catch(() => {
        tokenStore.clear()
        return null
      })
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config
    if (error.response?.status === 401 && original && !(original as { _retried?: boolean })._retried) {
      ;(original as { _retried?: boolean })._retried = true
      const newToken = await tryRefresh()
      if (newToken) {
        original.headers = original.headers ?? {}
        original.headers.Authorization = `Bearer ${newToken}`
        return api.request(original)
      }
      window.location.assign('/login')
    }

    const body = error.response?.data
    const message = body?.error?.message ?? error.message ?? 'An unexpected error occurred'
    const code = body?.error?.code ?? (error.response ? `HTTP_${error.response.status}` : 'NETWORK_ERROR')
    throw new ApiError(message, code, error.response?.status ?? null, body?.error?.request_id ?? null, body?.error?.details ?? null)
  },
)
