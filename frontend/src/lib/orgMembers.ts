import type { OrganizationRole } from '../types'

/**
 * Org members in the DocMind family: a consistent membership view for the
 * Members page. The backend does NOT expose a full member roster yet, so this
 * module backs the UI with an in-memory demo store seeded from the currently
 * signed-in user plus sample colleagues.
 *
 * Every function below is a swap-in point — replace the body with the matching
 * API call (see "Backend tasks required" in the feature handoff) and drop the
 * demo store once those endpoints ship.
 */

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

/** Sparse identity block the UI has today (not yet a first-class backend model). */
export interface SelfContext {
  user_id: number
  email: string
  name?: string | null
  role: OrganizationRole
}

export interface InviteInput {
  email: string
  role: OrganizationRole
}

const DEMO_LATENCY_MS = 420
const store = new Map<number, OrgMember[]>()

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

let demoIdBase = 0
const nextMemberId = () => ++demoIdBase

function seed(orgId: number, self: SelfContext) {
  const demo: OrgMember[] = [
    { id: nextMemberId(), user_id: 9001, role: 'admin', email: 'priya@example.com', name: 'Priya Sharma', joined_at: daysAgo(34), status: 'active' },
    { id: nextMemberId(), user_id: 9002, role: 'user', email: 'marcus@example.com', name: 'Marcus Reed', joined_at: daysAgo(21), status: 'active' },
    { id: nextMemberId(), user_id: 9003, role: 'user', email: 'lena@example.com', name: 'Lena Okafor', joined_at: daysAgo(12), status: 'active' },
    { id: nextMemberId(), user_id: 9004, role: 'user', email: 'invite@example.com', name: null, joined_at: daysAgo(1), status: 'pending' },
  ]
  const current: OrgMember = {
    id: nextMemberId(),
    user_id: self.user_id,
    role: self.role,
    email: self.email,
    name: self.name ?? null,
    joined_at: daysAgo(60),
    status: 'active',
  }
  store.set(orgId, [current, ...demo])
}

function ensureSeeded(orgId: number, self: SelfContext) {
  if (!store.has(orgId)) seed(orgId, self)
}

/**
 * List members for an organization.
 * TODO(backend): `GET /organizations/{org_id}/members` — returns the roster
 * with email/name/joined_at/status (auth required; admin or member).
 */
export async function listOrgMembers(orgId: number, self: SelfContext): Promise<OrgMember[]> {
  ensureSeeded(orgId, self)
  await wait(DEMO_LATENCY_MS)
  return (store.get(orgId) as OrgMember[]).map((m) => ({ ...m }))
}

/**
 * Invite a new member by email with an optional role.
 * TODO(backend): `POST /organizations/{org_id}/members` `{ email, role }`
 * (admin only). Duplicate invites reject with a user-friendly message.
 */
export async function inviteToOrg(
  orgId: number,
  self: SelfContext,
  input: InviteInput,
): Promise<OrgMember> {
  ensureSeeded(orgId, self)
  await wait(DEMO_LATENCY_MS)

  const list = store.get(orgId) as OrgMember[]
  const normalized = input.email.trim().toLowerCase()
  const existing = list.some((m) => m.email.toLowerCase() === normalized)
  if (existing) throw new Error('That email is already a member of this organization.')

  const member: OrgMember = {
    id: nextMemberId(),
    user_id: 10_000 + list.length,
    role: input.role,
    email: normalized,
    name: null,
    joined_at: new Date().toISOString(),
    status: 'pending',
  }
  list.push(member)
  return { ...member }
}

/**
 * Promote or demote a member (multiple admins are supported).
 * TODO(backend): `PATCH /organizations/{org_id}/members/{user_id}` `{ role }`
 * (admin only).
 */
export async function setOrgMemberRole(
  orgId: number,
  self: SelfContext,
  memberId: number,
  role: OrganizationRole,
): Promise<OrgMember> {
  ensureSeeded(orgId, self)
  await wait(DEMO_LATENCY_MS)

  const list = store.get(orgId) as OrgMember[]
  const member = list.find((m) => m.id === memberId)
  if (!member) throw new Error('Member not found.')
  const updated = { ...member, role }
  list.splice(list.indexOf(member), 1, updated)
  return { ...updated }
}

/**
 * Remove a member from the organization.
 * TODO(backend): `DELETE /organizations/{org_id}/members/{user_id}`
 * (admin only).
 */
export async function removeOrgMember(
  orgId: number,
  self: SelfContext,
  memberId: number,
): Promise<void> {
  ensureSeeded(orgId, self)
  await wait(DEMO_LATENCY_MS)

  const list = store.get(orgId) as OrgMember[]
  const member = list.find((m) => m.id === memberId)
  if (!member) throw new Error('Member not found.')
  store.set(
    orgId,
    list.filter((m) => m.id !== memberId),
  )
}