import { apiFetch } from './api'
import type { OrganizationRole } from '../types'

export type MemberStatus = 'active' | 'pending'

export interface OrgMember {
  id: number
  user_id: number
  role: OrganizationRole
  email: string
  name: string | null
  joined_at: string
  status: MemberStatus
}

export interface InviteInput {
  email: string
  role: OrganizationRole
}

/**
 * List members for an organization.
 * `GET /organizations/{org_id}/members` — returns the roster with
 * email/name/joined_at/status (any member).
 */
export async function listOrgMembers(orgId: number): Promise<OrgMember[]> {
  return apiFetch<OrgMember[]>(`/organizations/${orgId}/members`)
}

/**
 * Invite a new member by email with an optional role.
 * `POST /organizations/{org_id}/members` `{ email, role }` (admin only).
 * Duplicate invites reject with a user-friendly message.
 */
export async function inviteToOrg(orgId: number, input: InviteInput): Promise<OrgMember> {
  return apiFetch<OrgMember>(`/organizations/${orgId}/members`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/**
 * Promote or demote a member (multiple admins are supported).
 * `PATCH /organizations/{org_id}/members/{user_id}` `{ role }` (admin only).
 */
export async function setOrgMemberRole(
  orgId: number,
  userId: number,
  role: OrganizationRole,
): Promise<OrgMember> {
  return apiFetch<OrgMember>(`/organizations/${orgId}/members/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })
}

/**
 * Remove a member from the organization (admin only).
 * `DELETE /organizations/{org_id}/members/{user_id}`.
 */
export async function removeOrgMember(orgId: number, userId: number): Promise<void> {
  await apiFetch(`/organizations/${orgId}/members/${userId}`, { method: 'DELETE' })
}

/**
 * Leave an organization as the signed-in member.
 * Same route as removing a member, but targets the current user's own row.
 */
export async function leaveOrg(orgId: number, userId: number): Promise<void> {
  await apiFetch(`/organizations/${orgId}/members/${userId}`, { method: 'DELETE' })
}