export interface User {
  id: number
  email: string
  created_at: string
}

export type OrganizationRole = 'admin' | 'user'

export interface OrganizationMember {
  id: number
  user_id: number
  organization_id: number
  role: OrganizationRole
}

export interface Organization {
  id: number
  name: string
  created_at: string
}

export interface OrganizationWithMembers extends Organization {
  members: OrganizationMember[]
}

export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface DocumentRecord {
  id: number
  title: string
  content: string | null
  created_at: string
  owner_id: number
  organization_id: number
  processing_status: DocumentStatus
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
  error?: boolean
}

export interface ChatRequest {
  organizationId: number
  question: string
}

export interface DocumentUploadResult {
  document: DocumentRecord
}

/** Shape of source payloads the backend may emit in a stream (currently latent). */
export interface ChunkSource {
  id?: number
  document_id?: number
  document_title?: string
  content?: string
  score?: number
  page?: number
}