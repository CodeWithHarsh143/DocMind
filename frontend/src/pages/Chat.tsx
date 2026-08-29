import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageCircleQuestion, MessageSquarePlus, History as HistoryIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useOrg } from '../context/OrgContext'
import { useAutoScroll } from '../hooks/useAutoScroll'
import { useChatSessions } from '../hooks/useChatSessions'
import { streamChatAnswer, ApiStreamError } from '../lib/chat'
import { refreshAccessToken, AUTH_EVENT } from '../lib/api'
import { ChatMessage as MessageBubble } from '../components/chat/ChatMessage'
import { ChatInput } from '../components/chat/ChatInput'
import { ChatEmptyState } from '../components/chat/ChatEmptyState'
import { ChatHistoryPanel } from '../components/chat/ChatHistoryPanel'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/Feedback'

export default function ChatPage() {
  const { activeOrg } = useOrg()
  const { token } = useAuth()
  const { ref, bump } = useAutoScroll<HTMLDivElement>()

  const {
    sessions,
    activeSessionId,
    activeMessages,
    loading: sessionsLoading,
    createSession,
    selectSession,
    deleteSession,
    appendUserMessage,
    updateAssistantMessage,
  } = useChatSessions(activeOrg?.id)

  const [streaming, setStreaming] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  // Running streamed text per assistant message id (avoids stale-state reads in callbacks).
  const streamBufferRef = useRef<Record<string, string>>({})

  useEffect(() => {
    if (activeMessages.length) bump()
  }, [activeMessages, bump])

  // Stop any in-flight stream when leaving the page.
  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const handleSend = useCallback(
    async (question: string) => {
      if (!activeOrg || streaming || !token) return

      const { sessionId, assistantId } = appendUserMessage(question)
      streamBufferRef.current[assistantId] = ''
      const controller = new AbortController()
      abortRef.current = controller
      setStreaming(true)
      setHistoryOpen(false)

      const run = async (accessToken: string): Promise<void> => {
        await streamChatAnswer(
          activeOrg.id,
          question,
          accessToken,
          controller.signal,
          {
            onToken: (t) => {
              streamBufferRef.current[assistantId] += t
              updateAssistantMessage(sessionId, assistantId, {
                content: streamBufferRef.current[assistantId],
              })
            },
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
              updateAssistantMessage(sessionId, assistantId, {
                content: msg,
                streaming: false,
                error: true,
              })
              delete streamBufferRef.current[assistantId]
              setStreaming(false)
            },
            onDone: () => {
              updateAssistantMessage(sessionId, assistantId, { streaming: false })
              delete streamBufferRef.current[assistantId]
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeOrg, streaming, token, appendUserMessage, updateAssistantMessage],
  )

  const handleSuggestion = (prompt: string) => {
    void handleSend(prompt)
  }

  const handleNewChat = () => {
    abortRef.current?.abort()
    setStreaming(false)
    createSession()
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
      {/* Chat header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-2.5 sm:px-6">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={<HistoryIcon size={15} />}
          onClick={() => setHistoryOpen((v) => !v)}
          aria-expanded={historyOpen}
        >
          History
        </Button>
        {activeSessionId && activeMessages.length > 0 ? (
          <span className="hidden min-w-0 flex-1 truncate text-[13px] text-[var(--text-2)] sm:block">
            {sessions.find((s) => s.id === activeSessionId)?.title}
          </span>
        ) : (
          <span className="flex-1" />
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<MessageSquarePlus size={15} />}
          onClick={handleNewChat}
        >
          New Chat
        </Button>
      </div>

      {/* History slide-in panel */}
      <ChatHistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        loading={sessionsLoading}
        onSelect={(id) => {
          abortRef.current?.abort()
          setStreaming(false)
          selectSession(id)
          setHistoryOpen(false)
        }}
        onNew={() => {
          handleNewChat()
          setHistoryOpen(false)
        }}
        onDelete={deleteSession}
      />

      <div ref={ref} className="flex-1 overflow-y-auto scroll-smooth">
        <div
          className={`mx-auto flex ${
            activeMessages.length
              ? 'min-h-fit max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6'
              : 'h-full flex-col'
          }`}
        >
          {activeMessages.length === 0 ? (
            <div className="flex flex-1 flex-col justify-center">
              <ChatEmptyState orgName={activeOrg.name} onSuggestion={handleSuggestion} />
            </div>
          ) : (
            activeMessages.map((m) => (
              <div key={m.id} className="mx-auto w-full max-w-3xl">
                <MessageBubble message={m} />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-0)]/40 backdrop-blur-xl">
        <div className="pt-1">
          <ChatInput
            onSend={(t) => void handleSend(t)}
            onStop={handleStop}
            streaming={streaming}
            disabled={sessionsLoading}
          />
        </div>
      </div>
    </div>
  )
}
