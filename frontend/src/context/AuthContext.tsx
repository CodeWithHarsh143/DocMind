/* oxlint-disable react/only-export-components -- context module: provider + hook pair */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as authApi from '../lib/auth'
import { AUTH_EVENT, clearTokens, getAccessToken, ApiError, apiFetch } from '../lib/api'
import { isNetworkError } from '../lib/errors'
import type { User } from '../types'

const ACTIVE_ORG_STORAGE_KEY = 'docmind.active_org_id'

function clearSessionStorage() {
  localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY)
}

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error'

export interface ProfilePatch {
  name?: string
  phone?: string | null
  avatar_url?: string | null
}

interface AuthContextValue {
  user: User | null
  status: AuthStatus
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  updateProfile: (patch: ProfilePatch) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      if (!getAccessToken()) {
        if (!cancelled) setStatus('unauthenticated')
        return
      }
      try {
        const me = await authApi.getMe()
        if (!cancelled) {
          setUser(me)
          setStatus('authenticated')
        }
      } catch (err) {
        if (!cancelled) {
          if (isNetworkError(err) || (err instanceof ApiError && err.status >= 500)) {
            setStatus('error')
            return
          }
          clearTokens()
          clearSessionStorage()
          setUser(null)
          setStatus('unauthenticated')
        }
      }
    }

    const onExpired = () => {
      clearTokens()
      clearSessionStorage()
      setUser(null)
      setStatus('unauthenticated')
    }

    bootstrap()
    window.addEventListener(AUTH_EVENT, onExpired)
    return () => {
      cancelled = true
      window.removeEventListener(AUTH_EVENT, onExpired)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    await authApi.login({ email, password })
    const me = await authApi.getMe()
    setUser(me)
    setStatus('authenticated')
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    await authApi.register({ email, password })
  }, [])

  const updateProfile = useCallback(async (patch: ProfilePatch) => {
    const updated = await apiFetch<User>('/users/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
    setUser((prev) => (prev ? { ...prev, ...updated } : prev))
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    clearTokens()
    clearSessionStorage()
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      token: getAccessToken(),
      login,
      register,
      updateProfile,
      logout,
    }),
    [user, status, login, register, updateProfile, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}