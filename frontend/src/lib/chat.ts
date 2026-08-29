import { API_URL } from './api'
import type { ChunkSource } from '../types'

export interface StreamHandlers {
  onToken: (token: string) => void
  onSources?: (sources: ChunkSource[]) => void
  onError: (err: Error) => void
  onDone?: () => void
}

/**
 * Streams an answer from the RAG chat endpoint.
 *
 * The backend streams plain-text tokens over a `text/event-stream`.
 * Each decoded chunk is forwarded as-is. If a future backend version
 * frames structured data (JSON) inside the stream, it is detected and
 * dispatched to `onSources` — keeping the UI forward-compatible without
 * breaking the current protocol.
 */
export async function streamChatAnswer(
  organizationId: number,
  question: string,
  token: string,
  signal: AbortSignal,
  handlers: StreamHandlers,
) {
  const params = new URLSearchParams({ question })
  const res = await fetch(`${API_URL}/documents/chat/${organizationId}?${params.toString()}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'text/event-stream',
    },
    signal,
  })

  if (!res.ok || !res.body) {
    let message = `Request failed (${res.status})`
    try {
      const body = (await res.json()) as { detail?: string }
      if (body.detail) message = body.detail
    } catch {
      // ignore parse errors, fall back to status message
    }
    throw new ApiStreamError(res.status, message)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let boundary: number
      while ((boundary = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 1)
        if (!line) continue
        handleLine(line, handlers)
      }
    }
    if (buffer.trim()) handleLine(buffer, handlers)
    handlers.onDone?.()
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      handlers.onDone?.()
      return
    }
    handlers.onError(err instanceof Error ? err : new Error(String(err)))
  } finally {
    reader.releaseLock()
  }
}

function handleLine(line: string, handlers: StreamHandlers) {
  const trimmed = line.trim()
  // Structured source/event payloads are JSON and may be prefixed with
  // SSE-style markers like "data:" or "event:". Plain tokens are appended.
  const payload = trimmed.replace(/^data:\s*/i, '').replace(/^event:\s*sources\s*/i, '')
  if (payload.startsWith('{')) {
    try {
      const parsed = JSON.parse(payload) as { sources?: ChunkSource[] }
      if (Array.isArray(parsed.sources)) {
        handlers.onSources?.(parsed.sources)
        return
      }
    } catch {
      // not JSON — treat as plain text below
    }
  }
  handlers.onToken(line + '\n')
}

export class ApiStreamError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiStreamError'
    this.status = status
  }
}