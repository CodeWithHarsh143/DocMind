/* oxlint-disable react/only-export-components -- context module: provider + hook pair */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as authApi from '../lib/auth'
import { AUTH_EVENT, clearTokens, getAccessToken } from '../lib/api'
import type { User } from '../types'

const ACTIVE_ORG_STORAGE_KEY = 'docmind.active_org_id'

function clearSessionStorage() {
  localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY)
}

interface AuthContextValue {
  user: User | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')

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
      } catch {
        if (!cancelled) {
          clearTokens()
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
      logout,
    }),
    [user, status, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}