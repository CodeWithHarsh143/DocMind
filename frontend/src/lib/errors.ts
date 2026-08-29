import { ApiError } from './api'

export const NETWORK_MESSAGE = 'Unable to connect to the server.'

const STATUS_MESSAGES: Record<number, string> = {
  400: 'The server couldn’t process the request.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You don’t have permission to do that.',
  404: 'The requested resource wasn’t found.',
  405: 'This action isn’t supported.',
  409: 'This action conflicts with existing data — try modifying your input.',
  422: 'Please check the information you entered.',
  429: 'You’re moving a little fast — please wait a moment and try again.',
  500: 'The server hit an unexpected problem. Please try again.',
  502: 'The server is temporarily unavailable. Please try again shortly.',
  503: 'The server is temporarily unavailable. Please try again shortly.',
  504: 'The server took too long to respond. Please try again.',
}

/** Messages the backend already phrases well for end users; surface them as-is. */
const USER_FRIENDLY_DETAILS = new Set([
  'Incorrect email or password',
  'Email already registered',
  'Organization name already exists',
  'Unsupported file type.',
  'Rate limit exceeded',
])

function meaningfulDetail(message: string): boolean {
  const trimmed = message.trim()
  if (!trimmed) return false
  return (
    trimmed.length <= 120 &&
    /[A-Za-z]{4,}/.test(trimmed) &&
    !trimmed.includes('Traceback') &&
    !trimmed.includes('File "<') &&
    !trimmed.includes('sqlalchemy')
  )
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError
}

export function isNetworkError(err: unknown): boolean {
  if (err instanceof ApiError) return err.status === 0
  return err instanceof TypeError && err.message.includes('fetch')
}

/**
 * Converts an error from the API layer into a safe, human-readable message.
 * Known backend details that are already user facing are kept; technical
 * details are replaced with friendly copy so nothing internal ever leaks.
 */
export function friendlyErrorMessage(err: unknown, fallback: string): string {
  if (isApiError(err)) {
    if (err.status === 0) return NETWORK_MESSAGE

    const detail = err.message.trim()
    if (detail && meaningfulDetail(detail) && USER_FRIENDLY_DETAILS.has(detail)) return detail

    return STATUS_MESSAGES[err.status] ?? fallback
  }

  if (err instanceof TypeError && err.message.includes('fetch')) return NETWORK_MESSAGE

  const message = err instanceof Error ? err.message : ''
  return message && meaningfulDetail(message) ? message : fallback
}