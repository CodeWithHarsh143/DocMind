import { apiFetch, apiFetchForm, getRefreshToken, setTokens, clearTokens } from './api'
import type { AuthTokens, User } from '../types'

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  email: string
  password: string
}

export async function login(input: LoginInput): Promise<AuthTokens> {
  const params = new URLSearchParams()
  params.set('username', input.email)
  params.set('password', input.password)
  const tokens = await apiFetchForm<AuthTokens>('/auth/login', params)
  setTokens(tokens.access_token, tokens.refresh_token)
  return tokens
}

export async function register(input: RegisterInput): Promise<User> {
  return apiFetch<User>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function getMe(): Promise<User> {
  return apiFetch<User>('/auth/me')
}

export async function loginWithGoogle(idToken: string): Promise<AuthTokens> {
  const tokens = await apiFetch<AuthTokens>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ id_token: idToken }),
  })
  setTokens(tokens.access_token, tokens.refresh_token)
  return tokens
}

export async function logout() {
  const refreshToken = getRefreshToken()
  try {
    if (refreshToken) {
      await apiFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
    }
  } catch {
    // Best-effort cleanup even if the backend is unreachable.
  } finally {
    clearTokens()
  }
}