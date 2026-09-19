import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { renderWithProviders } from './render'
import LoginPage from '../pages/Login'
import { handlers } from './handlers'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => {
  server.resetHandlers()
  localStorage.clear()
})
afterAll(() => server.close())

function getPasswordInput() {
  return screen.getByLabelText('Password', { exact: true })
}

describe('Login page', () => {
  it('renders the login form with email and password fields', () => {
    renderWithProviders(<LoginPage />)

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument()
    expect(getPasswordInput()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders Google sign-in button', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
  })

  it('renders forgot password link', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByRole('link', { name: /forgot password/i })).toBeInTheDocument()
  })

  it('renders register link', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByRole('link', { name: /create an account/i })).toBeInTheDocument()
  })

  it('shows validation errors for empty fields on submit', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/please enter your email address/i)).toBeInTheDocument()
    expect(screen.getByText(/please enter your password/i)).toBeInTheDocument()
  })

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.type(screen.getByRole('textbox', { name: /email/i }), 'notanemail')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/please enter a valid email address/i)).toBeInTheDocument()
  })

  it('submits successfully with valid credentials', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.type(screen.getByRole('textbox', { name: /email/i }), 'test@example.com')
    await user.type(getPasswordInput(), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.queryByText(/signing in/i)).not.toBeInTheDocument()
    })
  })

  it('shows error message on failed login', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.type(screen.getByRole('textbox', { name: /email/i }), 'bad@example.com')
    await user.type(getPasswordInput(), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/sign in failed/i)).toBeInTheDocument()
    })
  })

  it('shows loading state while submitting', async () => {
    server.use(
      http.post('http://localhost/auth/login', async () => {
        await new Promise((r) => setTimeout(r, 100))
        return HttpResponse.json({
          access_token: 'access-delayed',
          refresh_token: 'refresh-delayed',
          token_type: 'bearer',
        })
      }),
    )

    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.type(screen.getByRole('textbox', { name: /email/i }), 'test@example.com')
    await user.type(getPasswordInput(), 'password123')

    const submitBtn = screen.getByRole('button', { name: /sign in$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(submitBtn).toBeDisabled()
    })
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    const passwordInput = getPasswordInput()
    expect(passwordInput).toHaveAttribute('type', 'password')

    const toggle = screen.getByRole('button', { name: /show password/i })
    await user.click(toggle)
    expect(passwordInput).toHaveAttribute('type', 'text')

    const hideToggle = screen.getByRole('button', { name: /hide password/i })
    await user.click(hideToggle)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('disables submit button while request is in flight', async () => {
    server.use(
      http.post('http://localhost/auth/login', async () => {
        await new Promise((r) => setTimeout(r, 100))
        return HttpResponse.json({
          access_token: 'access-delayed',
          refresh_token: 'refresh-delayed',
          token_type: 'bearer',
        })
      }),
    )

    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.type(screen.getByRole('textbox', { name: /email/i }), 'test@example.com')
    await user.type(getPasswordInput(), 'password123')

    const submitBtn = screen.getByRole('button', { name: /sign in$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(submitBtn).toBeDisabled()
    })
  })
})
