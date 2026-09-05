import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronsUpDown, LoaderCircle, Plus } from 'lucide-react'
import { useOrg } from '../../context/OrgContext'
import { useToast } from '../../context/ToastContext'
import { Avatar } from '../ui/Brand'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Field'

interface OrgDropdownProps {
  onSelect?: () => void
}

export function OrgDropdown({ onSelect }: OrgDropdownProps) {
  const { organizations, organizationsLoading, activeOrg, setActiveOrganization, createOrganization } =
    useOrg()
  const { error, success } = useToast()
  const [open, setOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setCreateError('Give your workspace a name')
      return
    }
    setCreating(true)
    setCreateError(null)
    try {
      const org = await createOrganization(trimmed)
      setActiveOrganization(org)
      setModalOpen(false)
      setName('')
      success('Workspace created', `"${org.name}" is ready`)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Could not create workspace')
      error('Creation failed')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-2.5 text-left transition-colors hover:border-[var(--border-strong)]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="shrink-0">
          <Avatar name={activeOrg?.name ?? '?'} imageUrl={activeOrg?.logo_url ?? null} size="sm" alt="Workspace logo" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-3)]">
            Workspace
          </span>
          <span className="block truncate text-[13.5px] font-medium text-[var(--text-1)]">
            {organizationsLoading ? 'Loading…' : (activeOrg?.name ?? 'No workspace')}
          </span>
        </span>
        <ChevronsUpDown size={15} className="shrink-0 text-[var(--text-3)]" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface-1)] shadow-[var(--shadow-lg)]"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
          >
            <div className="max-h-64 overflow-y-auto p-1.5">
              {organizationsLoading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-5 text-[13px] text-[var(--text-3)]">
                  <LoaderCircle size={14} className="animate-spin" /> Loading workspaces…
                </div>
              ) : organizations.length === 0 ? (
                <div className="px-4 py-5 text-center text-[13px] text-[var(--text-3)]">
                  No workspaces yet
                </div>
              ) : (
                organizations.map((org) => (
                  <button
                    key={org.id}
                    role="menuitemradio"
                    aria-checked={activeOrg?.id === org.id}
                    onClick={() => {
                      setActiveOrganization(org)
                      setOpen(false)
                      onSelect?.()
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2 text-left text-[13.5px] transition-colors ${
                      activeOrg?.id === org.id
                        ? 'bg-[var(--accent-soft)] text-white'
                        : 'text-[var(--text-2)] hover:bg-[var(--hover)] hover:text-[var(--text-1)]'
                    }`}
                  >
                    <Avatar name={org.name} imageUrl={org.logo_url ?? null} size="sm" alt={`${org.name} logo`} />
                    <span className="min-w-0 flex-1 truncate">{org.name}</span>
                    {activeOrg?.id === org.id ? <Check size={14} className="shrink-0 text-[var(--accent-hi)]" /> : null}
                  </button>
                ))
              )}
            </div>
            <button
              onClick={() => {
                setOpen(false)
                setModalOpen(true)
              }}
              className="flex w-full items-center gap-2.5 border-t border-[var(--border-subtle)] px-4 py-3 text-[13.5px] font-medium text-[var(--accent-hi)] transition-colors hover:bg-[var(--hover)]"
            >
              <Plus size={14} /> New workspace
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
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
            placeholder="e.g. Engineering Docs"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={createError ?? undefined}
            maxLength={80}
          />
          <div className="flex justify-end gap-2.5">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              Create workspace
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}