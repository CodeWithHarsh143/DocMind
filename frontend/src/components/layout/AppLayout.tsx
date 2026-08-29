import { useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Building2, LogOut, MessageSquareText, LayoutDashboard, Files, Sparkles, Users, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useOrg } from '../../context/OrgContext'
import { useToast } from '../../context/ToastContext'
import { Logo, Avatar } from '../ui/Brand'
import { Spinner } from '../ui/Spinner'
import { TopBar } from './TopBar'
import { OrgDropdown } from './OrgDropdown'

interface SidebarBodyProps {
  onNavigate?: () => void
}

function SidebarBody({ onNavigate }: SidebarBodyProps) {
  const { user, logout } = useAuth()
  const { activeOrg } = useOrg()
  const { success } = useToast()

  const links = [
    { to: '/app', end: true, label: 'Dashboard', icon: LayoutDashboard },
    { to: '/app/documents', end: false, label: 'Documents', icon: Files },
    { to: '/app/chat', end: false, label: 'Ask & Chat', icon: MessageSquareText },
    { to: '/app/members', end: false, label: 'Members', icon: Users },
    { to: '/app/organization', end: false, label: 'Organization', icon: Building2 },
  ]

  const handleLogout = async () => {
    await logout()
    success('Signed out', 'See you soon!')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-2 pt-5">
        <Link to="/" onClick={onNavigate} aria-label="DocMind — go home">
          <Logo />
        </Link>
      </div>

      <div className="px-3">
        <OrgDropdown onSelect={onNavigate} />
      </div>

      <div className="mt-4 flex-1 space-y-1 px-3" aria-label="Primary">
        {links.map(({ to, end, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-[var(--radius-md)] px-3.5 py-2.5 text-[14px] font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-[var(--accent-soft)] text-white'
                  : 'text-[var(--text-2)] hover:bg-[var(--hover)] hover:text-[var(--text-1)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-accent-grad"
                  />
                ) : null}
                <Icon size={17} className={isActive ? 'text-[var(--accent-hi)]' : ''} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>

      <div className="border-t border-[var(--border-subtle)] px-3 py-3">
        {activeOrg ? (
          <div className="mb-2 flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent-soft)]/60 px-3 py-2 text-[12.5px] text-[var(--text-2)]">
            <Sparkles size={13} className="shrink-0 text-[var(--accent-hi)]" />
            <span className="truncate">
              RAG active on <span className="font-medium text-[var(--text-1)]">{activeOrg.name}</span>
            </span>
          </div>
        ) : null}
        <div className="flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2">
          <NavLink
            to="/app/profile"
            onClick={onNavigate}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-md)] transition-colors hover:bg-[var(--hover)]"
            title="Edit profile"
          >
            <Avatar name={user?.name ?? user?.email ?? '?'} imageUrl={user?.avatar_url} size="sm" alt="Your profile picture" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-[var(--text-1)]">
                {user?.name ?? user?.email}
              </div>
              {user?.name ? (
                <div className="truncate text-[11.5px] text-[var(--text-3)]">{user.email}</div>
              ) : null}
            </div>
          </NavLink>
          <button
            onClick={handleLogout}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-md)] text-[var(--text-3)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--danger)]"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AppLayout() {
  const { organizationsLoading } = useOrg()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="flex h-dvh overflow-hidden">
      <div className="aurora" aria-hidden />

      {/* Desktop sidebar */}
      <aside className="hidden w-[var(--sidebar-w)] shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-1)]/70 backdrop-blur-xl lg:block">
        <SidebarBody />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.button
              aria-label="Close menu"
              className="absolute inset-0 cursor-default bg-[rgba(4,4,10,0.6)] backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              className="absolute inset-y-0 left-0 w-[288px] border-r border-[var(--border)] bg-[var(--bg-1)]"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            >
              <button
                onClick={() => setDrawerOpen(false)}
                className="absolute right-3 top-4 grid h-8 w-8 place-items-center rounded-[var(--radius-md)] text-[var(--text-3)] hover:text-[var(--text-1)]"
                aria-label="Close menu"
              >
                <X size={17} />
              </button>
              <SidebarBody onNavigate={() => setDrawerOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenu={() => setDrawerOpen(true)} />
        <main className="relative flex-1 overflow-y-auto">
          {organizationsLoading ? (
            <div className="grid h-full place-items-center">
              <Spinner size={28} />
            </div>
          ) : (
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          )}
        </main>
      </div>
    </div>
  )
}

export { RequireActiveOrg }

function RequireActiveOrg() {
  const { organizations, organizationsLoading } = useOrg()

  if (organizationsLoading) {
    return (
      <div className="grid h-full place-items-center">
        <Spinner size={28} />
      </div>
    )
  }

  if (organizations.length === 0) {
    return <Navigate to="/app" replace />
  }

  return <Outlet />
}