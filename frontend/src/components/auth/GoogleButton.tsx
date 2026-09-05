import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../ui/Button'
import { useAuth } from '../../context/AuthContext'

interface PromptMomentNotification {
  isNotDisplayed: () => boolean
  isSkippedMoment: () => boolean
  getNotDisplayedReason?: () => string
  getSkippedReason?: () => string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
          }) => void
          prompt: (moment: (notification: PromptMomentNotification) => void) => void
        }
      }
    }
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client'

export function GoogleButton({ disabled = false }: { disabled?: boolean }) {
  const { loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = searchParams.get('next')
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!clientId) return

    function initGoogle() {
      try {
        if (!window.google?.accounts?.id) {
          throw new Error('Google Identity Services did not initialize')
        }
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            try {
              await loginWithGoogle(response.credential)
              navigate(next && next.startsWith('/') ? next : '/app', { replace: true })
            } catch {
              // error handled by auth context / toast
            }
          },
        })
        setReady(true)
        setLoadError(null)
      } catch (err) {
        console.error('[GoogleButton] failed to init:', err)
        setLoadError('Google sign-in could not be loaded. Check your network or ad-blocker.')
      }
    }

    if (window.google?.accounts?.id) {
      initGoogle()
      return
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SRC}"]`,
    )
    if (existing) {
      existing.addEventListener('load', initGoogle)
      existing.addEventListener('error', handleScriptError)
      return () => {
        existing.removeEventListener('load', initGoogle)
        existing.removeEventListener('error', handleScriptError)
      }
    }

    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.defer = true
    script.onload = initGoogle
    script.onerror = handleScriptError
    document.head.appendChild(script)

    function handleScriptError() {
      console.error(`[GoogleButton] failed to load ${GIS_SRC}`)
      setLoadError('Google sign-in could not be loaded. Check your network or ad-blocker.')
    }

    return () => {
      script.removeEventListener('load', initGoogle)
      script.removeEventListener('error', handleScriptError)
    }
  }, [clientId, loginWithGoogle, navigate, next])

  const handleClick = () => {
    if (!ready || !window.google?.accounts?.id) return
    window.google.accounts.id.prompt((moment) => {
      if (moment.isNotDisplayed() || moment.isSkippedMoment()) {
        console.warn('[GoogleButton] prompt suppressed:', moment.getNotDisplayedReason?.())
      }
    })
  }

  const isDisabled = disabled || !clientId || !ready

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        fullWidth
        disabled={isDisabled}
        onClick={handleClick}
        className="gap-2"
        style={{ background: '#ffffff', color: '#111827' }}
        title={
          !clientId
            ? 'Google sign-in not configured'
            : loadError
              ? loadError
              : undefined
        }
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.7 1.22 9.2 3.6l6.85-6.85C35.9 2.4 30.5 0 24 0 14.6 0 6.4 5.5 2.5 13.4l8 6.2C12.6 14 17.7 9.5 24 9.5Z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.5c0-1.37-.12-2.7-.35-3.98H24v7.5h12.93c-.55 2.9-2.2 5.36-4.7 7.03l7.3 5.66c4.27-3.93 6.78-9.73 6.78-16.21Z"
          />
          <path
            fill="#FBBC05"
            d="M10.5 28.68a13.94 13.94 0 0 1 0-8.8l-8-6.2C.9 16.85 0 20.3 0 24s.9 7.15 2.5 10.35l8-6.17Z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.5 0 11.95-2.15 15.93-5.85l-7.3-5.66c-2.03 1.37-4.63 2.17-8.63 2.17-6.3 0-11.4-4.35-13.3-10.18l-8 6.2C6.4 42.5 14.6 48 24 48Z"
          />
        </svg>
        Continue with Google
      </Button>
      {loadError && (
        <p className="mt-2 text-center text-[11.5px] text-[var(--danger)]">
          {loadError}
        </p>
      )}
    </>
  )
}
