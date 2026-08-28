import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageCircleQuestion } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useOrg } from '../context/OrgContext'
import { useAutoScroll } from '../hooks/useAutoScroll'
import { streamChatAnswer, ApiStreamError } from '../lib/chat'
import { refreshAccessToken, AUTH_EVENT } from '../lib/api'
import { uid } from '../lib/utils'
import type { ChatMessage } from '../types'
import { ChatMessage as MessageBubble } from '../components/chat/ChatMessage'
import { ChatInput } from '../components/chat/ChatInput'
import { ChatEmptyState } from '../components/chat/ChatEmptyState'
import { EmptyState } from '../components/ui/Feedback'

export default function ChatPage() {
  const { activeOrg } = useOrg()
  const { token } = useAuth()
  const { ref, bump } = useAutoScroll<HTMLDivElement>()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (messages.length) bump()
  }, [messages, bump])

  // Reset the conversation when the workspace changes.
  const lastOrgRef = useRef<number | null>(null)
  useEffect(() => {
    if (lastOrgRef.current !== activeOrg?.id && activeOrg) {
      lastOrgRef.current = activeOrg.id
      setMessages([])
      abortRef.current?.abort()
      setStreaming(false)
    }
  }, [activeOrg?.id, activeOrg])

  const appendToken = useCallback((assistantId: string, text: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + text } : m)),
    )
  }, [])

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const handleSend = useCallback(
    async (question: string) => {
      if (!activeOrg || streaming || !token) return

      const assistantId = uid()
      const controller = new AbortController()
      abortRef.current = controller

      setMessages((prev) => [
        ...prev,
        { id: uid(), role: 'user', content: question },
        { id: assistantId, role: 'assistant', content: '', streaming: true },
      ])
      setStreaming(true)

      const run = async (accessToken: string): Promise<void> => {
        await streamChatAnswer(
          activeOrg.id,
          question,
          accessToken,
          controller.signal,
          {
            onToken: (t) => appendToken(assistantId, t),
            onError: async (err) => {
              if (err instanceof ApiStreamError && err.status === 401) {
                const refreshed = await refreshAccessToken()
                if (refreshed) {
                  const nextToken = localStorage.getItem('docmind.access_token')
                  if (nextToken) {
                    await run(nextToken)
                    return
                  }
                }
                window.dispatchEvent(new Event(AUTH_EVENT))
                return
              }
              const msg =
                err instanceof ApiStreamError
                  ? err.message
                  : err instanceof Error
                    ? err.message
                    : 'Streaming connection interrupted'
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: m.content || msg,
                        streaming: false,
                        error: true,
                      }
                    : m,
                ),
              )
              setStreaming(false)
            },
            onDone: () => {
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)),
              )
              setStreaming(false)
            },
          },
        )
      }

      try {
        await run(token)
      } catch {
        // streamChatAnswer catches internally; nothing extra to do.
      }
    },
    [activeOrg, streaming, token, appendToken],
  )

  const handleSuggestion = (prompt: string) => {
    void handleSend(prompt)
  }

  if (!activeOrg) {
    return (
      <div className="mx-auto grid max-w-2xl place-items-center px-4 py-16">
        <EmptyState
          icon={<MessageCircleQuestion size={26} />}
          title="Choose a workspace to start chatting"
          description="Create or select a workspace from the sidebar, upload documents, then ask questions here."
        />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={ref} className="flex-1 overflow-y-auto scroll-smooth">
        <div className={`mx-auto flex ${messages.length ? 'min-h-fit flex-col gap-5 px-4 py-6 sm:px-6' : 'h-full flex-col'}`}>
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col justify-center">
              <ChatEmptyState orgName={activeOrg.name} onSuggestion={handleSuggestion} />
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="mx-auto w-full max-w-3xl">
                <MessageBubble message={m} />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-0)]/40 backdrop-blur-xl">
        <div className="pt-1">
          <ChatInput onSend={(t) => void handleSend(t)} onStop={handleStop} streaming={streaming} disabled={false} />
        </div>
      </div>
    </div>
  )
}