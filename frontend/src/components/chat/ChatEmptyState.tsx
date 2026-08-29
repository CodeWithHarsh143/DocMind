import { motion } from 'framer-motion'
import { FileSearch, Lightbulb, ListTree } from 'lucide-react'
import { BrandMark } from '../ui/Brand'

interface ChatEmptyStateProps {
  orgName: string | null
  onSuggestion: (prompt: string) => void
}

const SUGGESTIONS = [
  {
    icon: FileSearch,
    title: 'Summarize',
    prompt: 'Give me a concise summary of the documents in this workspace.',
  },
  {
    icon: ListTree,
    title: 'Extract key points',
    prompt: 'List the main topics and key takeaways covered in my documents.',
  },
  {
    icon: Lightbulb,
    title: 'Answer from docs',
    prompt: 'Based on the documents, what are the most important decisions we should prepare for?',
  },
]

export function ChatEmptyState({ orgName, onSuggestion }: ChatEmptyStateProps) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 pt-6 text-center sm:pt-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="relative mb-5 rounded-[var(--radius-xl)] shadow-[var(--glow-accent)]"
      >
        <BrandMark size={64} className="rounded-[var(--radius-xl)]" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="font-display text-2xl font-semibold tracking-tight sm:text-[28px]"
      >
        Ask anything about{' '}
        <span className="gradient-text">{orgName ?? 'your documents'}</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="mt-2 max-w-lg text-[14.5px] text-[var(--text-3)]"
      >
        Your questions are answered from the context of the documents in this workspace,
        streamed to you in real time.
      </motion.p>

      <div className="mt-8 grid w-full gap-3 sm:grid-cols-3">
        {SUGGESTIONS.map(({ icon: Icon, title, prompt }, i) => (
          <motion.button
            key={title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 + i * 0.07 }}
            onClick={() => onSuggestion(prompt)}
            className="group flex flex-col items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)]/70 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)]/50 hover:shadow-[var(--shadow-md)]"
          >
            <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-md)] bg-[var(--accent-soft)] text-[var(--accent-hi)] transition-transform duration-200 group-hover:scale-110">
              <Icon size={17} />
            </span>
            <span className="text-[13.5px] font-medium text-[var(--text-1)]">{title}</span>
            <span className="text-[12px] leading-relaxed text-[var(--text-3)]">{prompt}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}