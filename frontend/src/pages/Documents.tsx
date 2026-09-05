import { useCallback, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FileText, RefreshCw, Search, SearchX } from 'lucide-react'
import { useOrg } from '../context/OrgContext'
import { useDocuments } from '../hooks/useDocuments'
import { UploadDropzone } from '../components/documents/UploadDropzone'
import { DocumentCard } from '../components/documents/DocumentCard'
import { EmptyState } from '../components/ui/Feedback'
import { Button } from '../components/ui/Button'
import { SkeletonRows } from '../components/ui/Feedback'
import { ApiError } from '../lib/api'
import type { DocumentStatus } from '../types'

type StatusFilter = 'all' | DocumentStatus

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Ready' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'failed', label: 'Failed' },
]

export default function DocumentsPage() {
  const { activeOrg } = useOrg()
  const { documents, loading, error, refresh } = useDocuments(activeOrg?.id ?? null)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')

  const handleUploaded = useCallback(() => {
    void refresh()
  }, [refresh])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refresh()
    } finally {
      setRefreshing(false)
    }
  }

  const filteredDocuments = useMemo(() => {
    const q = query.trim().toLowerCase()
    return documents.filter((d) => {
      if (filter !== 'all' && d.processing_status !== filter) return false
      if (q && !d.title.toLowerCase().includes(q)) return false
      return true
    })
  }, [documents, query, filter])

  const hasActiveFilters = query.trim() !== '' || filter !== 'all'

  if (!activeOrg) {
    return (
      <div className="mx-auto grid max-w-2xl place-items-center px-4 py-16">
        <EmptyState
          icon={<FileText size={26} />}
          title="No active workspace"
          description="Pick or create a workspace from the sidebar to start managing documents."
        />
      </div>
    )
  }

  const completedCount = documents.filter((d) => d.processing_status === 'completed').length
  const processingCount = documents.filter((d) => d.processing_status === 'pending' || d.processing_status === 'processing').length

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeOrg.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28 }}
        >
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-[26px] font-semibold tracking-tight">Documents</h1>
              <p className="mt-1 text-[14px] text-[var(--text-3)]">
                Everything in <span className="font-medium text-[var(--text-2)]">{activeOrg.name}</span>. Upload a
                file and start asking questions about it.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[13px]">
              <span className="inline-flex items-center gap-1.5 text-[var(--text-2)]">
                <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
                {completedCount} ready
              </span>
              <span className="inline-flex items-center gap-1.5 text-[var(--text-2)]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--warning)]" />
                {processingCount} processing
              </span>
              <Button variant="ghost" size="sm" onClick={() => void handleRefresh()} loading={refreshing}>
                {!refreshing ? <RefreshCw size={14} /> : null}
                Refresh
              </Button>
            </div>
          </div>

          <UploadDropzone organizationId={activeOrg.id} onUploaded={handleUploaded} />

          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-[15px] font-semibold text-[var(--text-1)]">
                Uploaded documents
              </h2>
              <span className="text-[12.5px] text-[var(--text-3)]">{documents.length} total</span>
            </div>

            <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search documents by name…"
                  className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-1)] pl-9 pr-8 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 grid h-5 w-5 place-items-center rounded-full text-[var(--text-3)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text-1)]"
                  >
                    <SearchX size={14} />
                  </button>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {STATUS_OPTIONS.map((opt) => {
                  const active = filter === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFilter(opt.value)}
                      className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                        active
                          ? 'bg-[var(--accent-soft)] text-[var(--accent-hi)]'
                          : 'text-[var(--text-2)] hover:bg-[var(--hover)] hover:text-[var(--text-1)]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {error ? (
              <div className="rounded-[var(--radius-lg)] border border-[var(--danger)]/40 bg-[var(--danger-soft)]/40 px-4 py-3 text-sm text-[var(--danger)]">
                {error instanceof ApiError ? error.message : 'Could not load documents. Try refreshing.'}
              </div>
            ) : null}

            {loading && documents.length === 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)]/70 p-4">
                    <SkeletonRows rows={3} />
                  </div>
                ))}
              </div>
            ) : documents.length === 0 ? (
              <EmptyState
                icon={<FileText size={26} />}
                title="No documents yet"
                description="Upload a PDF, DOCX or TXT file above. Once processed, its contents power your RAG answers."
              />
            ) : filteredDocuments.length === 0 ? (
              <EmptyState
                icon={<Search size={26} />}
                title="No matching documents"
                description={
                  hasActiveFilters
                    ? 'No documents match your current search or status filter.'
                    : 'Nothing to show here.'
                }
                action={
                  hasActiveFilters ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setQuery('')
                        setFilter('all')
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
                  {filteredDocuments.map((doc) => (
                    <DocumentCard key={doc.id} document={doc} />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </section>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}