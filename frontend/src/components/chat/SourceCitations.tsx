import { motion } from 'framer-motion'
import { FileText } from 'lucide-react'
import type { ChunkSource } from '../../types'

interface SourceCitationsProps {
  sources: ChunkSource[]
}

function scoreLabel(score?: number): string | null {
  if (typeof score !== 'number' || Number.isNaN(score)) return null
  // Higher cosine similarity = more relevant; normalise to a friendly percentage.
  const pct = Math.round(Math.max(0, Math.min(1, score)) * 100)
  return `${pct}%`
}

export function SourceCitations({ sources }: SourceCitationsProps) {
  if (!sources.length) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mt-3"
    >
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--text-3)]">
        <FileText size={12} /> Sources
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((src, i) => {
          const label = src.document_title?.trim() || `Document ${src.document_id ?? i + 1}`
          const score = scoreLabel(src.score)
          const page = src.page
          return (
            <span
              key={src.id ?? `${label}-${i}`}
              title={src.content ? `…${src.content.slice(0, 240)}…` : undefined}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)]/60 px-2.5 py-1 text-[11.5px] font-medium text-[var(--text-2)]"
            >
              <span className="truncate">{label}</span>
              {page != null ? (
                <span className="shrink-0 text-[10.5px] text-[var(--text-3)]">· p.{page}</span>
              ) : null}
              {score ? (
                <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-1.5 text-[10px] text-[var(--accent-hi)]">
                  {score}
                </span>
              ) : null}
            </span>
          )
        })}
      </div>
    </motion.div>
  )
}
