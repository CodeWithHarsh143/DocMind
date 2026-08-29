import type { ChatMessage } from '../types'

export interface ChatSession {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
}

const KEY_PREFIX = 'docmind:chat:sessions:'

/** Truncate the first user message to a tidy session title. */
export function titleFromMessage(text: string, max = 40): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean
}

export function loadSessions(orgId: number): ChatSession[] {
  try {
    const raw = window.localStorage.getItem(`${KEY_PREFIX}${orgId}`)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ChatSession[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveSessions(orgId: number, sessions: ChatSession[]): void {
  try {
    window.localStorage.setItem(`${KEY_PREFIX}${orgId}`, JSON.stringify(sessions))
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

/** Relative timestamp: "2h ago", "Yesterday", "Aug 20", else a full date. */
export function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return 'Just now'
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`
  if (diff < day) return `${Math.floor(diff / hour)}h ago`

  const date = new Date(ts)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const daysAgo = Math.round((startOfToday - startOfDate) / day)

  if (daysAgo === 1) return 'Yesterday'
  if (daysAgo < 7) return `${daysAgo}d ago`

  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
}
