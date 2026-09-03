export const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

/** Resolve a backend asset path (e.g. `/uploads/x.png`) to an absolute URL. */
export function resolveAssetUrl(path?: string | null): string | null {
  if (!path) return null
  if (/^(https?:)?\/\//.test(path)) return path
  if (path.startsWith('/')) return `${API_URL}${path}`
  return path
}

export const AUTH_EVENT = 'docmind:auth-expired'

const ACCESS_KEY = 'docmind.access_token'
const REFRESH_KEY = 'docmind.refresh_token'

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_KEY, accessToken)
  localStorage.setItem(REFRESH_KEY, refreshToken)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export interface ApiErrorBody {
  detail?: string | Array<{ loc: string[]; msg: string; type: string }>
}

export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, message: string, code = 'api_error') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

function normalizeMessage(body: ApiErrorBody | null, status: number): string {
  if (!body) {
    if (status === 0 || status === 504) return 'Backend is unreachable. Please try again.'
    return `Request failed (${status})`
  }
  if (typeof body.detail === 'string') return body.detail
  if (Array.isArray(body.detail) && body.detail.length) {
    return body.detail.map((d) => d.msg.replace(/^Value error,\s*/i, '')).join('; ')
  }
  return `Request failed (${status})`
}

interface ApiFetchOptions extends RequestInit {
  /** Send a URLSearchParams body as application/x-www-form-urlencoded. */
  form?: boolean
  /** Skip automatic Bearer auth header. */
  auth?: boolean
}

let refreshing: Promise<boolean> | null = null

export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    if (!res.ok) return false
    const data = (await res.json()) as { access_token: string }
    setTokens(data.access_token, refreshToken)
    return true
  } catch {
    return false
  }
}

async function attemptRefresh(): Promise<boolean> {
  return refreshAccessToken()
}

async function rawFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const auth = options.auth ?? true
  const token = getAccessToken()

  if (auth && token) headers.set('Authorization', `Bearer ${token}`)
  if (options.form) {
    headers.set('Content-Type', 'application/x-www-form-urlencoded')
  }
  if (options.body && typeof options.body === 'string' && !options.form) {
    headers.set('Content-Type', 'application/json')
  }

  const init: RequestInit = { ...options, headers }
  const res = await fetch(`${API_URL}${path}`, init)

  if (res.status === 401 && auth && options.method !== 'POST' && path !== '/auth/refresh') {
    refreshing ??= attemptRefresh().finally(() => {
      refreshing = null
    })
    const ok = await refreshing
    if (ok) return rawFetch<T>(path, options)
    window.dispatchEvent(new Event(AUTH_EVENT))
  }

  if (res.status === 204) return undefined as T

  const text = await res.text()
  let body: ApiErrorBody | null = null
  try {
    body = text ? (JSON.parse(text) as ApiErrorBody) : null
  } catch {
    body = null
  }

  if (!res.ok) {
    const isNetwork = res.status === 502 || res.status === 503 || res.status === 504
    throw new ApiError(
      res.status,
      isNetwork ? 'Backend is unreachable. Please try again.' : normalizeMessage(body, res.status),
    )
  }

  return (body ?? undefined) as T
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  try {
    return await rawFetch<T>(path, options)
  } catch (err) {
    if (err instanceof TypeError && (err.message === 'Failed to fetch' || err.message.includes('fetch'))) {
      throw new ApiError(0, 'Cannot reach the server. Check that the backend is running.', 'network_error')
    }
    throw err
  }
}

/** POST a URLSearchParams body (used by the OAuth2-style login endpoint). */
export function apiFetchForm<T>(path: string, params: URLSearchParams): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', form: true, body: params.toString() })
}