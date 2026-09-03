import { apiFetch } from './api'
import type { Organization, OrganizationWithMembers } from '../types'

export interface OrganizationPatch {
  name?: string
  description?: string | null
  logo_url?: string | null
}

export async function createOrganization(name: string): Promise<Organization> {
  return apiFetch<Organization>('/organizations/', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function listMyOrganizations(): Promise<OrganizationWithMembers[]> {
  return apiFetch<OrganizationWithMembers[]>('/organizations/mine')
}

export async function updateOrganization(id: number, patch: OrganizationPatch): Promise<Organization> {
  return apiFetch<Organization>(`/organizations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export async function leaveOrganization(orgId: number, userId: number): Promise<void> {
  await apiFetch(`/organizations/${orgId}/members/${userId}`, { method: 'DELETE' })
}

export async function uploadLogo(orgId: number, file: File): Promise<{ logo_url: string }> {
  const fd = new FormData()
  fd.append('file', file)
  return apiFetch<{ logo_url: string }>(`/organizations/${orgId}/logo`, {
    method: 'POST',
    body: fd,
  })
}