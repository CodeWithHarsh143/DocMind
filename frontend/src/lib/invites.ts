import { apiFetch } from './api'

export interface Invitation {
  org_name: string
  inviter_name: string | null
  invited_email: string
  status: string
  token: string | null
}

export interface AcceptedInvite {
  id: number
  user_id: number
  role: 'admin' | 'user'
  name: string | null
  email: string | null
  avatar_url?: string | null
  status: 'active' | 'pending'
  joined_at: string | null
}

/** Public — fetch invite details for a token (no auth). */
export async function getInvite(token: string): Promise<Invitation> {
  return apiFetch<Invitation>(`/invite/${token}`, { auth: false })
}

/** List all pending invitations for the signed-in user. */
export async function listMyInvites(): Promise<Invitation[]> {
  return apiFetch<Invitation[]>(`/invite/mine`)
}

/** Accept an invitation by token. */
export async function acceptInvite(token: string): Promise<AcceptedInvite> {
  return apiFetch<AcceptedInvite>(`/invite/${token}/accept`, { method: 'POST' })
}

/** Reject/decline an invitation by token. */
export async function rejectInvite(token: string): Promise<void> {
  await apiFetch(`/invite/${token}/reject`, { method: 'POST' })
}
