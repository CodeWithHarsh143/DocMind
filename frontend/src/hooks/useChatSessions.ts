import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatMessage, ChatSession, ChatSessionMessage } from '../types'
import { uid } from '../lib/utils'
import {
  createSession as apiCreate,
  deleteSession as apiDelete,
  getSessionMessages,
  listSessions,
  titleFromMessage,
} from '../lib/chatSessions'

export interface ChatSessionController {
  sessions: ChatSession[]
  activeSessionId: string | null
  activeMessages: ChatMessage[]
  loading: boolean
  createSession: () => Promise<string>
  selectSession: (id: string) => void
  deleteSession: (id: string) => Promise<void>
  appendUserMessage: (
    sessionId: string,
    text: string,
  ) => { sessionId: string; assistantId: string }
  updateAssistantMessage: (
    sessionId: string,
    assistantId: string,
    patch: Partial<ChatMessage>,
  ) => void
}

function latestOf(sessions: ChatSession[]): ChatSession | null {
  return sessions.reduce<ChatSession | null>(
    (acc, s) => (acc && acc.updated_at >= s.updated_at ? acc : s),
    null,
  )
}

/** Convert a persisted backend message into the streamed UI shape. */
function toChatMessage(m: ChatSessionMessage): ChatMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    user_id: m.user_id ?? null,
    user_name: m.user_name ?? null,
    user_avatar_url: m.user_avatar_url ?? null,
    created_at: m.created_at,
    sources: m.sources?.length ? m.sources : undefined,
  }
}

export function useChatSessions(orgId: number | undefined): ChatSessionController {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const lastOrgRef = useRef<number | null>(null)
  const messagesLoadRef = useRef<string | null>(null)

  const loadMessages = useCallback(
    async (sessionId: string) => {
      messagesLoadRef.current = sessionId
      try {
        const list = await getSessionMessages(sessionId)
        if (messagesLoadRef.current === sessionId) {
          setMessages(list.map(toChatMessage))
        }
      } catch {
        if (messagesLoadRef.current === sessionId) setMessages([])
      }
      if (messagesLoadRef.current === sessionId) messagesLoadRef.current = null
    },
    [],
  )

  // Load the session list whenever the workspace changes.
  useEffect(() => {
    if (orgId === undefined || lastOrgRef.current === orgId) return
    lastOrgRef.current = orgId
    setLoading(true)
    setMessages([])
    setActiveSessionId(null)
    listSessions(orgId)
      .then((list) => {
        setSessions(list)
        const next = list.length ? latestOf(list)!.id : null
        setActiveSessionId(next)
        if (next) void loadMessages(next)
      })
      .catch(() => setSessions([]))
      .finally(() => setLoading(false))
  }, [orgId, loadMessages])

  const createSession = useCallback(async (): Promise<string> => {
    if (orgId === undefined) return ''
    const created = await apiCreate(orgId)
    setSessions((prev) => [
      { ...created, messages: [] },
      ...prev.filter((s) => s.id !== created.id),
    ])
    setActiveSessionId(created.id)
    setMessages([])
    return created.id
  }, [orgId])

  const selectSession = useCallback(
    (id: string) => {
      setActiveSessionId(id)
      setMessages([])
      void loadMessages(id)
    },
    [loadMessages],
  )

  const deleteSession = useCallback(
    async (id: string) => {
      const wasActive = activeSessionId === id
      try {
        await apiDelete(id)
        setSessions((prev) => {
          const next = prev.filter((s) => s.id !== id)
          if (wasActive) {
            const fallback = latestOf(next)
            setActiveSessionId(fallback?.id ?? null)
            setMessages([])
            if (fallback) void loadMessages(fallback.id)
          }
          return next
        })
      } catch {
        /* leave list unchanged on failure */
      }
    },
    [activeSessionId, loadMessages],
  )

  const appendUserMessage = useCallback(
    (sessionId: string, text: string): { sessionId: string; assistantId: string } => {
      const now = new Date().toISOString()
      const assistantId = uid()

      const userMsg: ChatMessage = {
        id: uid(),
        role: 'user',
        content: text,
        created_at: now,
      }
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        streaming: true,
      }
      setMessages((prev) => [...prev, userMsg, assistantMsg])

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                title:
                  !s.title || s.title === 'New chat'
                    ? titleFromMessage(text)
                    : s.title,
                updated_at: now,
              }
            : s,
        ),
      )

      return { sessionId, assistantId }
    },
    [],
  )

  const updateAssistantMessage = useCallback(
    (sessionId: string, assistantId: string, patch: Partial<ChatMessage>) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, ...patch } : m)),
      )
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, updated_at: new Date().toISOString() } : s,
        ),
      )
    },
    [],
  )

  return {
    sessions,
    activeSessionId,
    activeMessages: messages,
    loading,
    createSession,
    selectSession,
    deleteSession,
    appendUserMessage,
    updateAssistantMessage,
  }
}
