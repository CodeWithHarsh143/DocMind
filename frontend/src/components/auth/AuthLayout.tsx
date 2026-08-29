import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MessageSquareText, ShieldCheck, Zap } from 'lucide-react'
import { Logo } from '../ui/Brand'
import { ThemeToggle } from '../ui/ThemeToggle'

const FEATURES = [
  { icon: Zap, title: 'Instant answers', text: 'Streamed responses grounded in your documents.' },
  { icon: ShieldCheck, title: 'Private by design', text: 'Your files stay in your own workspaces.' },
  { icon: MessageSquareText, title: 'Conversational RAG', text: 'Ask follow-ups; DocMind keeps the context.' },
]

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="aurora" aria-hidden />

      {/* Brand panel */}
      <div className="relative hidden overflow-hidden border-r border-[var(--border-subtle)] bg-[var(--bg-1)]/40 p-12 lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[var(--accent)]/20 blur-[120px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-[var(--accent-2)]/10 blur-[120px]"
        />

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Link to="/" aria-label="DocMind — go home">
            <Logo />
          </Link>
        </motion.div>

        <div className="relative">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-[38px] font-semibold leading-[1.12] tracking-tight"
          >
            Your documents,
            <br />
            <span className="gradient-text">finally conversational.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mt-4 max-w-md text-[15px] leading-relaxed text-[var(--text-3)]"
          >
            DocMind turns your PDFs, DOCX and TXT files into a searchable knowledge base — ask
            questions and receive precise, cited answers in real time.
          </motion.p>

          <div className="mt-10 flex flex-col gap-5">
            {FEATURES.map(({ icon: Icon, title, text }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.26 + i * 0.08 }}
                className="flex items-start gap-4"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-1)] text-[var(--accent-hi)]">
                  <Icon size={17} />
                </span>
                <span>
                  <span className="block text-[14.5px] font-semibold text-[var(--text-1)]">{title}</span>
                  <span className="block text-[13px] leading-relaxed text-[var(--text-3)]">{text}</span>
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-3 text-[12.5px] text-[var(--text-3)]">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
            Retrieval-augmented · Gemini powered
          </span>
        </div>
      </div>

      {/* Form panel */}
      <div className="relative flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 lg:hidden">
            <Link to="/" aria-label="DocMind — go home">
              <Logo />
            </Link>
          </div>
          {children}
        </motion.div>
      </div>
    </div>
  )
}