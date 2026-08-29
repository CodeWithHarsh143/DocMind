import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../types'
import { uid } from '../lib/utils'
import {
  type ChatSession,
  loadSessions,
  saveSessions,
  titleFromMessage,
} from '../lib/chatSessions'

export interface ChatSessionController {
  sessions: ChatSession[]
  activeSessionId: string | null
  activeMessages: ChatMessage[]
  loading: boolean
  createSession: () => string
  selectSession: (id: string) => void
  deleteSession: (id: string) => void
  appendUserMessage: (text: string) => { sessionId: string; assistantId: string }
  updateAssistantMessage: (
    sessionId: string,
    assistantId: string,
    patch: Partial<ChatMessage>,
  ) => void
}

function latestOf(sessions: ChatSession[]): ChatSession | null {
  return sessions.reduce<ChatSession | null>(
    (acc, s) => (acc && acc.updatedAt >= s.updatedAt ? acc : s),
    null,
  )
}

/**
 * Workspace-scoped chat session state. Persisted to localStorage (per org) so
 * the last active session survives a page refresh. A real multi-user version
 * would replace the localStorage layer with the backend endpoints (see
 * backendtasks.txt).
 */
export function useChatSessions(orgId: number | undefined): ChatSessionController {
  const [sessions, setSessions] = useState<ChatSession[]>(() =>
    orgId ? loadSessions(orgId) : [],
  )
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(() => orgId !== undefined)
  const lastOrgRef = useRef<number | null>(null)

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null

  // Persist whenever the workspace-scoped list changes.
  useEffect(() => {
    if (orgId !== undefined) saveSessions(orgId, sessions)
  }, [sessions, orgId])

  // Reset + restore state whenever the workspace changes.
  useEffect(() => {
    if (orgId === undefined || lastOrgRef.current === orgId) return
    setLoading(true)
    // Simulate a short fetch for the loading state (replaced by a real GET later).
    // lastOrgRef is set inside the timeout so React StrictMode's effect
    // double-invoke (mount → cleanup → mount) doesn't permanently wedge
    // `loading` to true: the cleanup clears the timer and the second run
    // re-schedules it before the guard sees the org as handled.
    const t = window.setTimeout(() => {
      lastOrgRef.current = orgId
      const stored = loadSessions(orgId)
      setSessions(stored)
      setActiveSessionId(latestOf(stored)?.id ?? null)
      setLoading(false)
    }, 260)
    return () => window.clearTimeout(t)
  }, [orgId])

  const createSession = useCallback((): string => {
    const now = Date.now()
    const id = uid()
    const session: ChatSession = {
      id,
      title: 'New chat',
      createdAt: now,
      updatedAt: now,
      messages: [],
    }
    setSessions((prev) => [session, ...prev])
    setActiveSessionId(id)
    return id
  }, [])

  const selectSession = useCallback((id: string) => {
    setActiveSessionId(id)
  }, [])

  const deleteSession = useCallback(
    (id: string) => {
      const target = sessions.find((s) => s.id === id)
      if (!target) return
      const wasActive = activeSessionId === id
      const next = sessions.filter((s) => s.id !== id)
      setSessions(next)
      if (wasActive) {
        setActiveSessionId(next.length ? latestOf(next)!.id : null)
      }
    },
    [sessions, activeSessionId],
  )

  const appendUserMessage = useCallback(
    (text: string): { sessionId: string; assistantId: string } => {
      const assistantId = uid()
      const now = Date.now()
      let target = activeSession
      let createdSession = false

      if (!target) {
        target = {
          id: uid(),
          title: titleFromMessage(text),
          createdAt: now,
          updatedAt: now,
          messages: [],
        }
        createdSession = true
      }

      const userMsg: ChatMessage = { id: uid(), role: 'user', content: text }
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        streaming: true,
      }

      if (!target.title || target.title === 'New chat') {
        target = { ...target, title: titleFromMessage(text) }
      }
      target = {
        ...target,
        updatedAt: now,
        messages: [...target.messages, userMsg, assistantMsg],
      }

      if (createdSession) {
        setSessions((prev) => [target!, ...prev])
        setActiveSessionId(target!.id)
      } else {
        setSessions((prev) =>
          prev.map((s) => (s.id === target!.id ? target! : s)),
        )
      }

      return { sessionId: target!.id, assistantId }
    },
    [activeSession],
  )

  const updateAssistantMessage = useCallback(
    (sessionId: string, assistantId: string, patch: Partial<ChatMessage>) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                updatedAt: Date.now(),
                messages: s.messages.map((m) =>
                  m.id === assistantId ? { ...m, ...patch } : m,
                ),
              }
            : s,
        ),
      )
    },
    [],
  )

  return {
    sessions,
    activeSessionId,
    activeMessages: activeSession?.messages ?? [],
    loading,
    createSession,
    selectSession,
    deleteSession,
    appendUserMessage,
    updateAssistantMessage,
  }
}
