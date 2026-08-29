import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { OrgProvider } from './context/OrgContext'
import { Spinner } from './components/ui/Spinner'
import AppLayout, { RequireActiveOrg } from './components/layout/AppLayout'

const LandingPage = lazy(() => import('./pages/Landing'))
const LoginPage = lazy(() => import('./pages/Login'))
const RegisterPage = lazy(() => import('./pages/Register'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPassword'))
const DashboardPage = lazy(() => import('./pages/Dashboard'))
const DocumentsPage = lazy(() => import('./pages/Documents'))
const ChatPage = lazy(() => import('./pages/Chat'))
const MembersPage = lazy(() => import('./pages/Members'))
const OrganizationSettingsPage = lazy(() => import('./pages/OrganizationSettings'))
const ProfilePage = lazy(() => import('./pages/Profile'))
const NotFoundPage = lazy(() => import('./pages/NotFound'))
const ServerErrorPage = lazy(() => import('./pages/ServerError'))

function PageLoader() {
  return (
    <div className="grid h-dvh place-items-center">
      <Spinner size={30} />
    </div>
  )
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') return (
    <div className="grid min-h-dvh place-items-center">
      <div className="aurora" aria-hidden />
      <Spinner size={30} />
    </div>
  )
  if (status === 'error') return <Navigate to="/server-error" replace />
  if (status !== 'authenticated') return <Navigate to="/login" replace />
  return children
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') return (
    <div className="grid min-h-dvh place-items-center">
      <div className="aurora" aria-hidden />
      <Spinner size={30} />
    </div>
  )
  if (status === 'authenticated') return <Navigate to="/app" replace />
  return children
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <OrgProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Suspense fallback={<PageLoader />}><LandingPage /></Suspense>} />
                <Route
                  path="/login"
                  element={
                    <RedirectIfAuthed>
                      <Suspense fallback={null}>
                        <LoginPage />
                      </Suspense>
                    </RedirectIfAuthed>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <RedirectIfAuthed>
                      <Suspense fallback={null}>
                        <RegisterPage />
                      </Suspense>
                    </RedirectIfAuthed>
                  }
                />
                <Route
                  path="/forgot-password"
                  element={
                    <RedirectIfAuthed>
                      <Suspense fallback={null}>
                        <ForgotPasswordPage />
                      </Suspense>
                    </RedirectIfAuthed>
                  }
                />
                <Route
                  path="/server-error"
                  element={
                    <Suspense fallback={null}>
                      <ServerErrorPage />
                    </Suspense>
                  }
                />

                <Route
                  path="/app"
                  element={
                    <RequireAuth>
                      <AppLayout />
                    </RequireAuth>
                  }
                >
                  <Route index element={<Suspense fallback={null}><DashboardPage /></Suspense>} />
                  <Route
                    path="profile"
                    element={
                      <Suspense fallback={null}>
                        <ProfilePage />
                      </Suspense>
                    }
                  />
                  <Route element={<RequireActiveOrg />}>
                    <Route path="documents" element={<Suspense fallback={null}><DocumentsPage /></Suspense>} />
                    <Route path="chat" element={<Suspense fallback={null}><ChatPage /></Suspense>} />
                    <Route path="members" element={<Suspense fallback={null}><MembersPage /></Suspense>} />
                    <Route
                      path="organization"
                      element={
                        <Suspense fallback={null}>
                          <OrganizationSettingsPage />
                        </Suspense>
                      }
                    />
                  </Route>
                </Route>

                <Route path="*" element={<Suspense fallback={null}><NotFoundPage /></Suspense>} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </OrgProvider>
      </AuthProvider>
    </ToastProvider>
  )
}