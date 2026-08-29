import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, FileImage, FileText, Hourglass, LoaderCircle, Sheet } from 'lucide-react'
import type { DocumentRecord } from '../../types'
import { getDocument } from '../../lib/documents'
import { Badge } from '../ui/Brand'
import { Spinner } from '../ui/Spinner'
import { Modal } from '../ui/Modal'
import { formatDate } from '../../lib/utils'
import { extensionOf } from '../../lib/documents'

const STATUS_CONFIG: Record<DocumentRecord['processing_status'], { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' | 'info'; icon: typeof Hourglass }> = {
  pending: { label: 'Pending', tone: 'neutral', icon: Hourglass },
  processing: { label: 'Processing', tone: 'warning', icon: LoaderCircle },
  completed: { label: 'Ready', tone: 'success', icon: Sheet },
  failed: { label: 'Failed', tone: 'danger', icon: Sheet },
}

function FileIcon({ title }: { title: string }) {
  const ext = extensionOf(title)
  const Icon = ext === '.pdf' ? FileImage : ext === '.docx' ? Sheet : FileText
  return <Icon size={22} />
}

export function DocumentCard({ document }: { document: DocumentRecord }) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [preview, setPreview] = useState<DocumentRecord | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const status = STATUS_CONFIG[document.processing_status] ?? STATUS_CONFIG.pending
  const StatusIcon = status.icon

  const openPreview = async () => {
    setPreviewOpen(true)
    setLoadingPreview(true)
    try {
      const full = await getDocument(document.id)
      setPreview(full)
    } catch {
      setPreview({ ...document, content: 'Could not load this document\'s contents.' })
    } finally {
      setLoadingPreview(false)
    }
  }

  const isProcessing = document.processing_status === 'pending' || document.processing_status === 'processing'

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="group relative flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)]/70 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--surface-1)] hover:shadow-[var(--shadow-md)]"
      >
        <div className="flex items-start justify-between gap-3">
          <span
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-md)] ${
              document.processing_status === 'failed'
                ? 'bg-[var(--danger-soft)] text-[var(--danger)]'
                : 'bg-[var(--accent-soft)] text-[var(--accent-hi)]'
            }`}
          >
            <FileIcon title={document.title} />
          </span>
          <Badge tone={status.tone}>
            <StatusIcon size={11} className={isProcessing ? 'animate-spin' : ''} />
            {status.label}
          </Badge>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14.5px] font-semibold text-[var(--text-1)]" title={document.title}>
            {document.title}
          </h3>
          <p className="mt-1 text-[12px] text-[var(--text-3)]">
            Added {formatDate(document.created_at)} · ID #{document.id}
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-3">
          <span className="text-[11.5px] uppercase tracking-wider text-[var(--text-3)]">
            {extensionOf(document.title).toUpperCase().slice(1) || 'DOC'}
          </span>
          <button
            onClick={() => void openPreview()}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[12.5px] font-medium text-[var(--text-2)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text-1)]"
          >
            <Eye size={13} /> Preview
          </button>
        </div>
      </motion.div>

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={document.title}
        description={`Document #${document.id} · Added ${formatDate(document.created_at)}`}
        className="max-w-2xl"
      >
        <div className="max-h-[60vh] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-1)] p-4">
          {loadingPreview ? (
            <div className="grid place-items-center py-16">
              <Spinner size={24} />
            </div>
          ) : (
            <pre
              className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-[var(--text-2)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {preview?.content || 'No extracted content yet.'}
            </pre>
          )}
        </div>
      </Modal>
    </>
  )
}