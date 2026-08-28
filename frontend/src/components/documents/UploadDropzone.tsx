import { useCallback, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FileImage, FileText, Info, Sheet, UploadCloud, X } from 'lucide-react'
import type { DocumentRecord } from '../../types'
import { ALLOWED_EXTENSIONS, extensionOf, uploadDocument } from '../../lib/documents'
import { formatFileSize } from '../../lib/utils'
import { useToast } from '../../context/ToastContext'

export const MAX_FILE_SIZE = 20 * 1024 * 1024

interface UploadItem {
  id: string
  fileName: string
  size: number
  progress: number
  status: 'uploading' | 'done' | 'error'
  error?: string
}

function iconFor(ext: string) {
  if (ext === '.pdf') return <FileImage size={20} />
  if (ext === '.docx') return <Sheet size={20} />
  return <FileText size={20} />
}

interface UploadDropzoneProps {
  organizationId: number
  onUploaded: (doc: DocumentRecord) => void
}

export function UploadDropzone({ organizationId, onUploaded }: UploadDropzoneProps) {
  const { error: throwToast, success } = useToast()
  const [dragging, setDragging] = useState(false)
  const [items, setItems] = useState<UploadItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const counter = useRef(0)

  const addItem = useCallback(
    (item: UploadItem) => setItems((prev) => [...prev.slice(-4), item]),
    [],
  )
  const patch = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }, [])

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        const ext = extensionOf(file.name)
        if (!ext) {
          throwToast('Unsupported file type', `Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`)
          continue
        }
        if (file.size > MAX_FILE_SIZE) {
          throwToast('File too large', `${file.name} exceeds the 20 MB limit`)
          continue
        }
        const id = `${Date.now()}-${counter.current++}`
        addItem({ id, fileName: file.name, size: file.size, progress: 0, status: 'uploading' })

        void uploadDocument({ organizationId, file }, (pct) => patch(id, { progress: pct }))
          .then((doc) => {
            patch(id, { progress: 100, status: 'done' })
            success('Document uploaded', `${file.name} queued for processing`)
            onUploaded(doc)
          })
          .catch((err: Error) => {
            patch(id, { status: 'error', error: err.message })
            throwToast('Upload failed', err.message)
          })
      }
    },
    [addItem, organizationId, onUploaded, patch, success, throwToast],
  )

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload documents"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`group relative cursor-pointer overflow-hidden rounded-[var(--radius-xl)] border-2 border-dashed p-8 text-center transition-all duration-300 sm:p-10 ${
          dragging
            ? 'border-[var(--accent)] bg-[var(--accent-soft)] scale-[1.01]'
            : 'border-[var(--border-strong)] hover:border-[var(--accent)]/60 hover:bg-[var(--surface-1)]/60'
        }`}
      >
        <motion.div
          animate={{ scale: dragging ? 1.12 : 1 }}
          className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[var(--radius-lg)] bg-[var(--accent-grad)] text-[var(--bg-0)] shadow-[var(--glow-accent)]"
        >
          <UploadCloud size={24} />
        </motion.div>
        <h3 className="font-display text-[16px] font-semibold">
          {dragging ? 'Drop to upload' : 'Drag & drop your documents'}
        </h3>
        <p className="mt-1 text-[13.5px] text-[var(--text-3)]">
          or <span className="font-medium text-[var(--accent-hi)] underline underline-offset-2">browse files</span> — PDF, DOCX, TXT · up to 20 MB
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="flex items-center gap-3.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)]/70 px-4 py-3"
          >
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-md)] ${
                item.status === 'error' ? 'bg-[var(--danger-soft)] text-[var(--danger)]' : 'bg-[var(--accent-soft)] text-[var(--accent-hi)]'
              }`}
            >
              {iconFor(extensionOf(item.fileName))}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-[13.5px] font-medium text-[var(--text-1)]">
                  {item.fileName}
                </span>
                <span className="shrink-0 text-[11.5px] text-[var(--text-3)]">
                  {item.status === 'error'
                    ? 'Failed'
                    : item.status === 'done'
                      ? 'Queued'
                      : `${item.progress}%`}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
                  <motion.div
                    className={`h-full rounded-full ${item.status === 'error' ? 'bg-[var(--danger)]' : 'bg-[var(--accent-grad)]'}`}
                    animate={{ width: `${item.progress}%` }}
                    transition={{ ease: 'easeOut', duration: 0.3 }}
                  />
                </div>
                <span className="shrink-0 text-[11px] text-[var(--text-3)]">
                  {formatFileSize(item.size)}
                </span>
              </div>
              {item.error ? (
                <p className="mt-1.5 flex items-center gap-1 text-[12px] text-[var(--danger)]">
                  <Info size={12} /> {item.error}
                </p>
              ) : null}
            </div>
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${
                item.status === 'error'
                  ? 'bg-[var(--danger-soft)] text-[var(--danger)]'
                  : item.status === 'done'
                    ? 'bg-[var(--success-soft)] text-[var(--success)]'
                    : 'bg-[rgba(255,255,255,0.08)] text-[var(--text-2)]'
              }`}
            >
              {item.status === 'error' ? <X size={12} /> : item.status === 'done' ? '✓' : item.progress}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}