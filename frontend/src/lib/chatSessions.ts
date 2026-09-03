import { apiFetch } from './api'
import type { ChatSession, ChatSessionMessage } from '../types'

/** Truncate the first user message to a tidy session title. */
export function titleFromMessage(text: string, max = 40): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean
}

/** List this workspace's sessions, newest first. */
export function listSessions(orgId: number): Promise<ChatSession[]> {
  return apiFetch<ChatSession[]>(`/organizations/${orgId}/sessions`)
}

/** Create a new empty session for a workspace. */
export function createSession(orgId: number): Promise<ChatSession> {
  return apiFetch<ChatSession>(`/organizations/${orgId}/sessions`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

/** Fetch the full message transcript for one session, oldest first. */
export function getSessionMessages(sessionId: string): Promise<ChatSessionMessage[]> {
  return apiFetch<ChatSessionMessage[]>(`/sessions/${sessionId}/messages`)
}

/** Permanently remove a session and its messages. */
export async function deleteSession(sessionId: string): Promise<void> {
  await apiFetch(`/sessions/${sessionId}`, { method: 'DELETE' })
}

/** Relative timestamp: "2h ago", "Yesterday", "Aug 20", else a full date. */
export function relativeTime(ts: string | number): string {
  const time = typeof ts === 'string' ? new Date(ts).getTime() : ts
  const diff = Date.now() - time
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (Number.isNaN(time) || diff < minute) return 'Just now'
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`
  if (diff < day) return `${Math.floor(diff / hour)}h ago`

  const date = new Date(time)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const daysAgo = Math.round((startOfToday - startOfDate) / day)

  if (daysAgo === 1) return 'Yesterday'
  if (daysAgo < 7) return `${daysAgo}d ago`

  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
}
