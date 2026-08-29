import { useCallback, useEffect, useRef, useState } from 'react'
import type { OrganizationRole, User } from '../types'
import * as membersApi from '../lib/orgMembers'
import type { InviteInput, OrgMember, SelfContext } from '../lib/orgMembers'

function makeSelf(user: User | null, role: OrganizationRole | undefined): SelfContext | null {
  if (!user) return null
  return { user_id: user.id, email: user.email, name: user.name ?? null, role: role ?? 'user' }
}

/**
 * Loads and mutates the member roster for an org. The backend does not expose
 * a roster endpoint yet, so reads/writes go through the demo store in
 * `lib/orgMembers.ts` (each function carries the target API call as a TODO).
 */
export function useOrgMembers(orgId: number | null, user: User | null, ownRole: OrganizationRole | undefined) {
  const [members, setMembers] = useState<OrgMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const selfRef = useRef<SelfContext | null>(null)

  useEffect(() => {
    selfRef.current = makeSelf(user, ownRole)
  }, [user, ownRole])

  const refresh = useCallback(async () => {
    const self = selfRef.current
    const id = orgId
    if (!self || id == null) return
    setLoading(true)
    setError(null)
    try {
      const list = await membersApi.listOrgMembers(id, self)
      setMembers(list)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    setMembers([])
    setError(null)
    void refresh()
  }, [refresh])

  const addMember = useCallback(
    async (input: InviteInput): Promise<void> => {
      const self = selfRef.current
      if (!self || orgId == null) throw new Error('Missing organization context.')
      const member = await membersApi.inviteToOrg(orgId, self, input)
      setMembers((prev) => [...prev, member])
    },
    [orgId],
  )

  const setRole = useCallback(
    async (memberId: number, role: OrganizationRole): Promise<void> => {
      if (!orgId || !selfRef.current) return
      const updated = await membersApi.setOrgMemberRole(orgId, selfRef.current, memberId, role)
      setMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)))
    },
    [orgId],
  )

  const removeMember = useCallback(
    async (memberId: number): Promise<void> => {
      if (!orgId || !selfRef.current) return
      await membersApi.removeOrgMember(orgId, selfRef.current, memberId)
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
    },
    [orgId],
  )

  return { members, loading, error, refresh, addMember, setRole, removeMember }
}