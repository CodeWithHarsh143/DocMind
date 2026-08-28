import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FileText, RefreshCw } from 'lucide-react'
import { useOrg } from '../context/OrgContext'
import { useDocuments } from '../hooks/useDocuments'
import { UploadDropzone } from '../components/documents/UploadDropzone'
import { DocumentCard } from '../components/documents/DocumentCard'
import { EmptyState } from '../components/ui/Feedback'
import { Button } from '../components/ui/Button'
import { SkeletonRows } from '../components/ui/Feedback'
import { ApiError } from '../lib/api'

export default function DocumentsPage() {
  const { activeOrg } = useOrg()
  const { documents, loading, error, refresh } = useDocuments(activeOrg?.id ?? null)
  const [refreshing, setRefreshing] = useState(false)

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
            ) : (
              <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
                  {documents.map((doc) => (
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