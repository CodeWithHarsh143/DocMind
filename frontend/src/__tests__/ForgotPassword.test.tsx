import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { renderWithProviders } from './render'
import ForgotPasswordPage from '../pages/ForgotPassword'
import { handlers } from './handlers'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('ForgotPassword page', () => {
  it('renders the identify step by default', () => {
    renderWithProviders(<ForgotPasswordPage />)

    expect(screen.getByRole('heading', { name: /forgot your password/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email or phone/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send reset code/i })).toBeInTheDocument()
  })

  it('renders the recovery steps indicator', () => {
    renderWithProviders(<ForgotPasswordPage />)
    expect(screen.getByRole('list', { name: /recovery steps/i })).toBeInTheDocument()
  })

  it('shows validation error for empty identifier', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ForgotPasswordPage />)

    await user.click(screen.getByRole('button', { name: /send reset code/i }))

    expect(await screen.findByText(/please enter your email or phone number/i)).toBeInTheDocument()
  })

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ForgotPasswordPage />)

    await user.type(screen.getByLabelText(/email or phone/i), 'bad@')
    await user.click(screen.getByRole('button', { name: /send reset code/i }))

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument()
  })

  it('advances to OTP step after valid identifier submission', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ForgotPasswordPage />)

    await user.type(screen.getByLabelText(/email or phone/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send reset code/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /check your inbox/i })).toBeInTheDocument()
    })
    expect(screen.getByText(/we sent a 6-digit code/i)).toBeInTheDocument()
  })

  it('renders OTP digit inputs', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ForgotPasswordPage />)

    await user.type(screen.getByLabelText(/email or phone/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send reset code/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /check your inbox/i })).toBeInTheDocument()
    })

    const otpGroup = screen.getByRole('group', { name: /one-time code/i })
    expect(otpGroup).toBeInTheDocument()

    for (let i = 1; i <= 6; i++) {
      expect(screen.getByLabelText(new RegExp(`digit ${i}`, 'i'))).toBeInTheDocument()
    }
  })

  it('disables verify button until all OTP digits are entered', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ForgotPasswordPage />)

    await user.type(screen.getByLabelText(/email or phone/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send reset code/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /check your inbox/i })).toBeInTheDocument()
    })

    const verifyBtn = screen.getByRole('button', { name: /verify code/i })
    expect(verifyBtn).toBeDisabled()
  })

  it('enables verify button when all 6 digits are entered', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ForgotPasswordPage />)

    await user.type(screen.getByLabelText(/email or phone/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send reset code/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /check your inbox/i })).toBeInTheDocument()
    })

    const digits = ['1', '2', '3', '4', '5', '6']
    for (const d of digits) {
      await user.type(screen.getByLabelText(new RegExp(`digit ${digits.indexOf(d) + 1}`, 'i')), d)
    }

    const verifyBtn = screen.getByRole('button', { name: /verify code/i })
    await waitFor(() => {
      expect(verifyBtn).toBeEnabled()
    })
  })

  it('shows error on invalid OTP code', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ForgotPasswordPage />)

    await user.type(screen.getByLabelText(/email or phone/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send reset code/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /check your inbox/i })).toBeInTheDocument()
    })

    const digits = ['0', '0', '0', '0', '0', '0']
    for (let idx = 0; idx < digits.length; idx++) {
      await user.type(screen.getByLabelText(new RegExp(`digit ${idx + 1}`, 'i')), digits[idx])
    }

    await user.click(screen.getByRole('button', { name: /verify code/i }))

    await waitFor(() => {
      expect(screen.getByText(/that code did not verify/i)).toBeInTheDocument()
    })
  })

  it('allows going back from OTP step to identify step', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ForgotPasswordPage />)

    await user.type(screen.getByLabelText(/email or phone/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send reset code/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /check your inbox/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /use a different email or phone/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /forgot your password/i })).toBeInTheDocument()
    })
  })

  it('shows resend countdown after OTP step', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ForgotPasswordPage />)

    await user.type(screen.getByLabelText(/email or phone/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send reset code/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /check your inbox/i })).toBeInTheDocument()
    })

    expect(screen.getByText(/resend in \d+s/i)).toBeInTheDocument()
  })

  it('shows login link', () => {
    renderWithProviders(<ForgotPasswordPage />)
    expect(screen.getByRole('link', { name: /back to sign in/i })).toBeInTheDocument()
  })
})
