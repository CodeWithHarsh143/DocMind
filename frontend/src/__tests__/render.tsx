import { type ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { OrgProvider, useOrg } from '../context/OrgContext'
import { ToastProvider } from '../context/ToastContext'
import { ThemeProvider } from '../context/ThemeContext'

function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <OrgProvider>{children}</OrgProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}

function AuthReady({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') return null
  return <>{children}</>
}

function OrgReady({ children }: { children: React.ReactNode }) {
  const { organizationsLoading } = useOrg()
  if (organizationsLoading) return null
  return <>{children}</>
}

function AuthAndOrgReadyProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <OrgProvider>
              <AuthReady>
                <OrgReady>{children}</OrgReady>
              </AuthReady>
            </OrgProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options })
}

export function renderAuthenticated(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AuthAndOrgReadyProviders, ...options })
}
