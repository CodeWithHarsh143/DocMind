import { Menu, ShieldCheck } from 'lucide-react'
import { useOrg } from '../../context/OrgContext'
import { Badge } from '../ui/Brand'

interface TopBarProps {
  onMenu: () => void
}

export function TopBar({ onMenu }: TopBarProps) {
  const { activeOrg } = useOrg()

  return (
    <header className="flex h-[var(--topbar-h)] shrink-0 items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-1)]/60 px-4 backdrop-blur-lg sm:px-6">
      <button
        onClick={onMenu}
        className="grid h-9 w-9 place-items-center rounded-[var(--radius-md)] text-[var(--text-2)] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--text-1)] lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={19} />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="truncate font-display text-[15px] font-medium">
          {activeOrg ? activeOrg.name : 'Workspace'}
        </span>
        {activeOrg ? (
          <Badge tone="info" className="hidden sm:inline-flex">
            <ShieldCheck size={11} /> {activeOrg.members[0]?.role ?? 'member'}
          </Badge>
        ) : null}
      </div>

      <div className="hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 md:flex">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--success)]" />
        </span>
        <span className="text-[12px] font-medium text-[var(--text-2)]">AI Online</span>
      </div>
    </header>
  )
}