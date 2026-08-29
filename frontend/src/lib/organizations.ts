import { apiFetch } from './api'
import type { Organization, OrganizationWithMembers } from '../types'

export async function createOrganization(name: string): Promise<Organization> {
  return apiFetch<Organization>('/organizations/', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function listMyOrganizations(): Promise<OrganizationWithMembers[]> {
  return apiFetch<OrganizationWithMembers[]>('/organizations/mine')
}