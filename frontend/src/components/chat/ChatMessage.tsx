import { motion } from 'framer-motion'
import { AlertTriangle, Sparkles } from 'lucide-react'
import type { ChatMessage } from '../../types'
import { MessageContent } from './MessageContent'
import { Avatar } from '../ui/Brand'

export function ChatMessage({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className={`flex w-full gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser ? (
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--accent-grad)] text-[var(--bg-0)] shadow-[var(--shadow-sm)]">
          <Sparkles size={15} />
        </span>
      ) : null}

      <div
        className={`min-w-0 max-w-[min(92%,760px)] ${
          isUser ? 'order-first' : 'order-last'
        }`}
      >
        {isUser ? (
          <div className="rounded-[var(--radius-lg)] rounded-tr-md bg-[var(--accent-grad)] px-4 py-3 text-[14.5px] leading-relaxed text-white shadow-[var(--shadow-sm)]">
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        ) : (
          <div
            className={`relative w-full rounded-[var(--radius-lg)] rounded-tl-md border px-5 py-4 ${
              message.error
                ? 'border-[var(--danger)]/50 bg-[var(--danger-soft)]/40'
                : 'border-[var(--border)] bg-[var(--surface-1)]/80 shadow-[var(--shadow-sm)]'
            }`}
          >
            {message.error ? (
              <div className="mb-2 flex items-center gap-2 text-[13px] font-medium text-[var(--danger)]">
                <AlertTriangle size={15} />
                The response could not be generated
              </div>
            ) : null}
            <div className={message.error ? 'text-[var(--text-2)]' : ''}>
              <MessageContent content={message.content} streaming={message.streaming ?? false} />
            </div>
          </div>
        )}
      </div>

      {isUser ? <Avatar name="You" size="sm" /> : null}
    </motion.div>
  )
}