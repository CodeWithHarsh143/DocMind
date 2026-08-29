import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { History, MessageSquarePlus, Trash2 } from 'lucide-react'
import type { ChatSession } from '../../lib/chatSessions'
import { relativeTime } from '../../lib/chatSessions'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { SkeletonRows } from '../ui/Feedback'

interface ChatHistoryPanelProps {
  open: boolean
  onClose: () => void
  sessions: ChatSession[]
  activeSessionId: string | null
  loading: boolean
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
}

export function ChatHistoryPanel({
  open,
  onClose,
  sessions,
  activeSessionId,
  loading,
  onSelect,
  onNew,
  onDelete,
}: ChatHistoryPanelProps) {
  const [pendingDelete, setPendingDelete] = useState<ChatSession | null>(null)

  return (
    <>
      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              aria-label="Close history panel"
              className="fixed inset-0 z-30 cursor-default bg-[rgba(4,4,10,0.45)] backdrop-blur-[2px] lg:left-[var(--sidebar-w)]"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Chat history"
              className="fixed inset-y-0 z-40 flex w-[300px] max-w-[85vw] flex-col border-r border-[var(--border)] bg-[var(--bg-1)]/95 backdrop-blur-xl lg:left-[var(--sidebar-w)]"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            >
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-[var(--radius-md)] bg-[var(--accent-soft)] text-[var(--accent-hi)]">
                    <History size={16} />
                  </span>
                  <div>
                    <h2 className="font-display text-[15px] font-semibold leading-tight">History</h2>
                    <p className="text-[11px] text-[var(--text-3)]">Current workspace</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onNew}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--accent-soft)] px-2.5 text-[12.5px] font-medium text-[var(--accent-hi)] transition-all duration-150 hover:brightness-110 active:translate-y-px"
                >
                  <MessageSquarePlus size={14} /> New
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2.5">
                {loading ? (
                  <div className="px-2 py-3">
                    <SkeletonRows rows={5} />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                    <span className="grid h-12 w-12 place-items-center rounded-[var(--radius-lg)] bg-[var(--accent-soft)] text-[var(--accent-2)]">
                      <MessageSquarePlus size={20} />
                    </span>
                    <p className="text-[13.5px] font-medium text-[var(--text-2)]">
                      No conversations yet
                    </p>
                    <p className="text-[12px] text-[var(--text-3)]">Start one above.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {sessions.map((s) => {
                      const active = s.id === activeSessionId
                      return (
                        <div
                          key={s.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => onSelect(s.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              onSelect(s.id)
                            }
                          }}
                          className={`group flex w-full cursor-pointer items-start gap-2 rounded-[var(--radius-md)] px-3 py-2.5 text-left transition-all duration-150 ${
                            active
                              ? 'bg-[var(--accent-soft)] shadow-[var(--shadow-sm)]'
                              : 'hover:bg-[var(--hover)]'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div
                              className={`truncate text-[13.5px] font-medium ${
                                active ? 'text-[var(--accent-hi)]' : 'text-[var(--text-1)]'
                              }`}
                            >
                              {s.title}
                            </div>
                            <div className="text-[11.5px] text-[var(--text-3)]">
                              {relativeTime(s.updatedAt)}
                            </div>
                          </div>
                          <button
                            type="button"
                            aria-label={`Delete conversation ${s.title}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setPendingDelete(s)
                            }}
                            className="grid h-7 w-7 shrink-0 place-items-center rounded-[var(--radius-sm)] text-[var(--text-3)] opacity-0 transition-all duration-150 hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] focus:opacity-100 group-hover:opacity-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            onDelete(pendingDelete.id)
            setPendingDelete(null)
            onClose()
          }
        }}
        title="Delete conversation?"
        description={
          pendingDelete
            ? `"${pendingDelete.title}" will be permanently removed for this workspace.`
            : undefined
        }
        confirmLabel="Delete"
      />
    </>
  )
}
