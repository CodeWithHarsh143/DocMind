import { apiFetch, getAccessToken, API_URL } from './api'
import type { DocumentRecord } from '../types'

export async function listDocuments(organizationId: number): Promise<DocumentRecord[]> {
  return apiFetch<DocumentRecord[]>(`/documents/organization/${organizationId}`)
}

export async function getDocument(documentId: number): Promise<DocumentRecord> {
  return apiFetch<DocumentRecord>(`/documents/${documentId}`)
}

export const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt'] as const

export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number]

export function extensionOf(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase()
  return ALLOWED_EXTENSIONS.includes(ext as AllowedExtension) ? ext : ''
}

function resolveUrl(path: string): string {
  return `${API_URL}${path}`
}

/**
 * Uploads a document with real byte-progress callbacks. The backend returns
 * the document record once the file has been saved and queued for processing.
 */
export function uploadDocument(
  params: {
    organizationId: number
    file: File
    title?: string
  },
  onProgress?: (pct: number) => void,
): Promise<DocumentRecord> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('organization_id', String(params.organizationId))
    form.append('file', params.file)
    if (params.title?.trim()) form.append('title', params.title.trim())

    const xhr = new XMLHttpRequest()
    xhr.open('POST', resolveUrl('/documents/upload'), true)

    const token = getAccessToken()
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      let body: { detail?: unknown } | null = null
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : null
      } catch {
        body = null
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as unknown as DocumentRecord)
        return
      }
      const message =
        body && typeof body.detail === 'string'
          ? body.detail
          : `Upload failed (${xhr.status})`
      reject(new Error(message))
    }

    xhr.onerror = () => reject(new Error('Cannot reach the server during upload.'))
    xhr.ontimeout = () => reject(new Error('Upload timed out. Please try again.'))

    xhr.send(form)
  })
}