import { motion } from 'framer-motion'
import { useTypewriter } from '../../hooks/useTypewriter'
import { Markdown } from './Markdown'

interface MessageContentProps {
  content: string
  streaming: boolean
}

/** While streaming, renders a smooth typewriter reveal with a caret; afterwards,
 *  the complete markdown is rendered statically. */
export function MessageContent({ content, streaming }: MessageContentProps) {
  const { displayed } = useTypewriter(content, streaming)
  const hasText = content.length > 0

  if (!hasText) {
    return (
      <span className="inline-flex items-center gap-1.5 py-1 text-[12.5px] text-[var(--text-3)]">
        <span className="flex gap-1" aria-label="Thinking">
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-[var(--accent-2)]"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-[var(--accent-2)]"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: 0.15 }}
          />
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-[var(--accent-2)]"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: 0.3 }}
          />
        </span>
        Thinking…
      </span>
    )
  }

  return (
    <div className="relative">
      <Markdown text={displayed} />
      {streaming ? <span className="stream-caret" aria-hidden /> : null}
    </div>
  )
}