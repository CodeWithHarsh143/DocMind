import { Button } from '../ui/Button'

/**
 * "Continue with Google" button — UI only. The onClick is intentionally a
 * no-op placeholder that never silently succeeds.
 *
 * TODO(backend + frontend): implement the real OAuth exchange
 * (`POST /oauth/google` token exchange, user creation/lookup). Until then this
 * button does nothing but tell the user it's coming soon; see the backend
 * task table for the endpoint contract.
 */
export function GoogleButton({ disabled = false }: { disabled?: boolean }) {
  return (
    <Button
      type="button"
      variant="secondary"
      fullWidth
      disabled={disabled}
      onClick={() => {
        // TODO: Google OAuth flow
      }}
      className="gap-3 bg-white text-[#1f2937] hover:bg-gray-50"
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
  )
}