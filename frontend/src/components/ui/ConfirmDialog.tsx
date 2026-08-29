import { AlertTriangle, Trash2 } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmLabel?: string
  confirmIcon?: 'trash' | 'warning'
  busy?: boolean
}

/** Destructive-action confirmation used for member removal and similar flows. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Remove',
  confirmIcon = 'trash',
  busy = false,
}: ConfirmDialogProps) {
  const Icon = confirmIcon === 'trash' ? Trash2 : AlertTriangle
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {description ? (
        <p className="text-sm leading-relaxed text-[var(--text-3)]">{description}</p>
      ) : null}
      <div className="mt-5 flex justify-end gap-2.5">
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="danger"
          loading={busy}
          leftIcon={<Icon size={15} />}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}