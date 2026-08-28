/* oxlint-disable react/only-export-components -- context module: provider + hook pair */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as orgApi from '../lib/organizations'
import type { OrganizationWithMembers } from '../types'
import { useAuth } from './AuthContext'

const ACTIVE_ORG_KEY = 'docmind.active_org_id'

interface OrgContextValue {
  organizations: OrganizationWithMembers[]
  organizationsLoading: boolean
  activeOrg: OrganizationWithMembers | null
  refreshOrganizations: () => Promise<void>
  createOrganization: (name: string) => Promise<OrganizationWithMembers>
  setActiveOrganization: (org: OrganizationWithMembers | null) => void
}

const OrgContext = createContext<OrgContextValue | null>(null)

export function OrgProvider({ children }: { children: ReactNode }) {
  const { status: authStatus } = useAuth()
  const [organizations, setOrganizations] = useState<OrganizationWithMembers[]>([])
  const [organizationsLoading, setOrganizationsLoading] = useState(true)
  const [activeOrgId, setActiveOrgId] = useState<number | null>(() => {
    const stored = localStorage.getItem(ACTIVE_ORG_KEY)
    return stored ? Number(stored) : null
  })

  const refreshOrganizations = useCallback(async () => {
    setOrganizationsLoading(true)
    try {
      const orgs = await orgApi.listMyOrganizations()
      setOrganizations(orgs)
    } finally {
      setOrganizationsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Load the user's workspaces once authenticated. Call is sync for the
    // loading flag, so silence the set-state-in-effect lint here (intentional).
    if (authStatus !== 'authenticated') return
    // oxlint-disable-next-line react/set-state-in-effect
    void refreshOrganizations()
  }, [authStatus, refreshOrganizations])

  const activeOrg = useMemo(() => {
    if (!activeOrgId) return organizations[0] ?? null
    return (
      organizations.find((o) => o.id === activeOrgId) ??
      organizations[0] ??
      null
    )
  }, [organizations, activeOrgId])

  const createOrganization = useCallback(async (name: string) => {
    const created = await orgApi.createOrganization(name)
    const full: OrganizationWithMembers = { ...created, members: [] }
    setOrganizations((prev) => [...prev, full])
    localStorage.setItem(ACTIVE_ORG_KEY, String(full.id))
    return full
  }, [])

  const setActiveOrganization = useCallback((org: OrganizationWithMembers | null) => {
    if (org) {
      setActiveOrgId(org.id)
      localStorage.setItem(ACTIVE_ORG_KEY, String(org.id))
    } else {
      setActiveOrgId(null)
      localStorage.removeItem(ACTIVE_ORG_KEY)
    }
  }, [])

  const value = useMemo<OrgContextValue>(
    () => ({
      organizations,
      organizationsLoading,
      activeOrg,
      refreshOrganizations,
      createOrganization,
      setActiveOrganization,
    }),
    [organizations, organizationsLoading, activeOrg, refreshOrganizations, createOrganization, setActiveOrganization],
  )

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error('useOrg must be used within OrgProvider')
  return ctx
}