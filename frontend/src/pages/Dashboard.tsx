import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, FilePlus2, Files, MessageSquareText, Sparkles, UploadCloud } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useOrg } from '../context/OrgContext'
import { useDocuments } from '../hooks/useDocuments'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Field'
import { EmptyState } from '../components/ui/Feedback'
import { useToast } from '../context/ToastContext'

function emailFirstName(email: string) {
  return email.split('@')[0]?.replace(/[._-]/g, ' ') || 'there'
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { activeOrg, organizations, refreshOrganizations, createOrganization } = useOrg()
  const { documents, loading: docsLoading } = useDocuments(activeOrg?.id ?? null)
  const { success, error: throwError } = useToast()

  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const ready = documents.filter((d) => d.processing_status === 'completed').length
  const processing = documents.filter((d) => d.processing_status === 'pending' || d.processing_status === 'processing').length
  const failed = documents.filter((d) => d.processing_status === 'failed').length

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setCreateError('Please name your workspace')
      return
    }
    setBusy(true)
    setCreateError(null)
    try {
      await createOrganization(trimmed)
      setCreateOpen(false)
      setName('')
      success('Workspace created', `"${trimmed}" is ready to use`)
      await refreshOrganizations()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Could not create workspace')
      throwError('Creation failed')
    } finally {
      setBusy(false)
    }
  }

  const createWorkspaceModal = (
    <Modal
      open={createOpen}
      onClose={() => setCreateOpen(false)}
      title="Create a workspace"
      description="A workspace groups the documents you ask questions about."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void handleCreate()
        }}
        className="flex flex-col gap-4"
      >
        <Input
          autoFocus
          label="Workspace name"
          placeholder="e.g. Research Papers"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={createError ?? undefined}
          maxLength={80}
        />
        <div className="flex justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Create workspace
          </Button>
        </div>
      </form>
    </Modal>
  )

  if (!activeOrg) {
    return (
      <>
        <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-6 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-1)]/50 px-6 py-16 text-center"
          >
            <div className="grid h-16 w-16 place-items-center rounded-[var(--radius-xl)] bg-accent-grad text-[var(--on-accent)] shadow-[var(--glow-accent)]">
              <Sparkles size={26} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold">
                Welcome, <span className="gradient-text">{user ? emailFirstName(user.email) : 'there'}</span>
              </h1>
              <p className="mx-auto mt-2 max-w-md text-[14.5px] text-[var(--text-3)]">
                Create a workspace to upload documents and chat with them. It's the first step toward
                instant answers from your own files.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {organizations.length > 0 ? (
                <Button variant="secondary" onClick={() => setCreateOpen(true)} leftIcon={<Files size={16} />}>
                  Create another workspace
                </Button>
              ) : (
                <Button onClick={() => setCreateOpen(true)} leftIcon={<UploadCloud size={16} />} size="lg">
                  Create your first workspace
                </Button>
              )}
            </div>
          </motion.div>
        </div>
        {createWorkspaceModal}
      </>
    )
  }

  const stats = [
    { label: 'Documents', value: documents.length, icon: Files, tone: 'var(--accent-hi)', soft: 'var(--accent-soft)' },
    { label: 'Ready to chat', value: ready, icon: Sparkles, tone: 'var(--success)', soft: 'var(--success-soft)' },
    { label: 'Processing', value: processing, icon: UploadCloud, tone: 'var(--warning)', soft: 'var(--warning-soft)' },
    { label: 'Failed', value: failed, icon: MessageSquareText, tone: 'var(--danger)', soft: 'var(--danger-soft)' },
  ]

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[26px] font-semibold tracking-tight">
              Good to see you, {user ? emailFirstName(user.email) : 'friend'}{' '}
            </h1>
            <p className="mt-1 text-[14px] text-[var(--text-3)]">
              Here's what's happening in <span className="font-medium text-[var(--text-2)]">{activeOrg.name}</span>.
            </p>
          </div>
          <Link to="/app/chat">
            <Button leftIcon={<MessageSquareText size={16} />}>
              Ask a question <ArrowRight size={15} />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, tone, soft }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.06 }}
              className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)]/70 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-medium text-[var(--text-3)]">{label}</span>
                <span className="grid h-8 w-8 place-items-center rounded-[var(--radius-md)]" style={{ background: soft, color: tone }}>
                  <Icon size={15} />
                </span>
              </div>
              <div className="mt-2 font-display text-[30px] font-semibold leading-none text-[var(--text-1)]">
                {docsLoading ? <span className="skeleton inline-block h-7 w-10" /> : value}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-5">
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)]/70 p-5 lg:col-span-3"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-[15px] font-semibold">Recent documents</h2>
              <Link to="/app/documents" className="text-[12.5px] font-medium text-[var(--accent-hi)] hover:underline">
                View all
              </Link>
            </div>
            {documents.length === 0 ? (
              <EmptyState
                icon={<Files size={22} />}
                title="No documents yet"
                description="Upload your first document to start building a knowledge base."
                action={
                  <Link to="/app/documents">
                    <Button size="sm" leftIcon={<UploadCloud size={14} />}>
                      Upload documents
                    </Button>
                  </Link>
                }
              />
            ) : (
              <ul className="flex flex-col gap-2.5">
                {documents.slice(0, 5).map((doc) => (
                  <li key={doc.id}>
                    <Link
                      to="/app/documents"
                      className="flex items-center gap-3 rounded-[var(--radius-md)] border border-transparent px-3 py-2.5 transition-colors hover:border-[var(--border)] hover:bg-[var(--surface-2)]"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--accent-soft)] text-[var(--accent-hi)]">
                        <FilePlus2 size={15} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-[var(--text-1)]">
                        {doc.title}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                          doc.processing_status === 'completed'
                            ? 'bg-[var(--success-soft)] text-[var(--success)]'
                            : doc.processing_status === 'failed'
                              ? 'bg-[var(--danger-soft)] text-[var(--danger)]'
                              : 'bg-[var(--warning-soft)] text-[var(--warning)]'
                        }`}
                      >
                        {doc.processing_status}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </motion.section>

          <motion.aside
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className="flex flex-col gap-4 p-5 lg:col-span-2"
          >
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)]/70 p-5">
              <h2 className="font-display mb-4 text-[15px] font-semibold">Next steps</h2>
              <ol className="flex flex-col gap-5">
                {[
                  { n: 1, t: 'Upload documents', d: 'Add PDFs, DOCX or TXT files that you want to query.' },
                  { n: 2, t: 'Wait for processing', d: 'DocMind extracts and embeds their content automatically.' },
                  { n: 3, t: 'Ask questions', d: 'Get streamed, context-aware answers grounded in your files.' },
                ].map((step) => (
                  <li key={step.n} className="flex gap-3">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-grad text-[12px] font-bold text-[var(--on-accent)]">
                      {step.n}
                    </span>
                    <div className="flex flex-col gap-1">
                      <div className="text-[13.5px] font-medium text-[var(--text-1)]">{step.t}</div>
                      <p className="text-[12.5px] leading-relaxed text-[var(--text-3)]">{step.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <button
              onClick={() => setCreateOpen(true)}
              className="group flex items-center justify-between rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] p-5 text-left transition-colors hover:border-[var(--accent)]/60 hover:bg-[var(--accent-soft)]/30"
            >
              <span className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-md)] bg-[var(--accent-soft)] text-[var(--accent-hi)]">
                  <UploadCloud size={16} />
                </span>
                <span className="text-[13.5px] font-medium text-[var(--text-1)]">New workspace</span>
              </span>
              <ArrowRight size={15} className="text-[var(--text-3)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent-hi)]" />
            </button>
          </motion.aside>
        </div>
      </motion.div>

      {createWorkspaceModal}
    </div>
  )
}