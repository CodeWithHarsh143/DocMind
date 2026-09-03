export interface User {
  id: number
  email: string
  created_at: string
  /**
   * Profile fields the backend will expose once the profile endpoints land
   * (backend tasks 6 & 10). Currently absent from /auth/me, so the UI treats
   * them as optional and seeds them client-side only.
   */
  name?: string | null
  phone?: string | null
  avatar_url?: string | null
}

export type OrganizationRole = 'admin' | 'user'

/**
 * Wire shape of a membership row. `email`/`name`/`joined_at`/`status` are
 * populated by the members endpoint that is pending on the backend
 * (backend tasks 1-3); today only id/user_id/organization_id/role arrive.
 */
export interface OrganizationMember {
  id: number
  user_id: number
  organization_id: number
  role: OrganizationRole
  email?: string
  name?: string | null
  joined_at?: string
  status?: 'active' | 'pending'
}

export interface Organization {
  id: number
  name: string
  created_at: string
  /** Optional fields for the settings page (backend task 4 & 5). */
  description?: string | null
  logo_url?: string | null
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
  /** Author attribution for user messages (loaded from the API transcript). */
  user_id?: number | null
  user_name?: string | null
}

/** Wire shape of a persisted chat session (backend tasks 14–18). */
export interface ChatSession {
  id: string
  title: string
  workspace_id: number
  created_at: string
  updated_at: string
  messages: ChatMessage[]
  /** Owner attribution (which member created this session). */
  owner_id?: number | null
  owner_name?: string | null
}

/** Wire shape of a persisted chat message (backend task 16/18). */
export interface ChatSessionMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  /** Author attribution for user messages. */
  user_id?: number | null
  user_name?: string | null
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