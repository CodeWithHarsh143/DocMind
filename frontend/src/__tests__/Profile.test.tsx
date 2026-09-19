import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { renderAuthenticated } from './render'
import ProfilePage from '../pages/Profile'
import { handlers } from './handlers'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => {
  server.resetHandlers()
  localStorage.clear()
})
afterAll(() => server.close())

function seedAuth() {
  localStorage.setItem('docmind.access_token', 'test-access-token')
  localStorage.setItem('docmind.refresh_token', 'test-refresh-token')
}

describe('Profile page', () => {
  it('renders the profile heading', async () => {
    seedAuth()
    renderAuthenticated(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^profile$/i })).toBeInTheDocument()
    })
  })

  it('renders the personal information section', async () => {
    seedAuth()
    renderAuthenticated(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText(/personal information/i)).toBeInTheDocument()
    })
  })

  it('renders name and phone input fields with user data', async () => {
    seedAuth()
    renderAuthenticated(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /full name/i })).toHaveValue('Test User')
    })
    expect(screen.getByRole('textbox', { name: /phone/i })).toHaveValue('+15550102030')
  })

  it('renders the email field as read-only with verified badge', async () => {
    seedAuth()
    renderAuthenticated(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })
    expect(screen.getByText(/verified/i)).toBeInTheDocument()
  })

  it('renders the avatar upload section', async () => {
    seedAuth()
    renderAuthenticated(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText(/profile picture/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /change picture/i })).toBeInTheDocument()
  })

  it('disables save button when form is not dirty', async () => {
    seedAuth()
    renderAuthenticated(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /full name/i })).toHaveValue('Test User')
    })

    const saveBtn = screen.getByRole('button', { name: /save changes/i })
    expect(saveBtn).toBeDisabled()
  })

  it('enables save button when name is changed', async () => {
    seedAuth()
    const user = userEvent.setup()
    renderAuthenticated(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /full name/i })).toHaveValue('Test User')
    })

    const nameInput = screen.getByRole('textbox', { name: /full name/i })
    await user.clear(nameInput)
    await user.type(nameInput, 'New Name')

    const saveBtn = screen.getByRole('button', { name: /save changes/i })
    await waitFor(() => {
      expect(saveBtn).toBeEnabled()
    })
  })

  it('shows validation error for invalid name', async () => {
    seedAuth()
    const user = userEvent.setup()
    renderAuthenticated(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /full name/i })).toHaveValue('Test User')
    })

    const nameInput = screen.getByRole('textbox', { name: /full name/i })
    await user.clear(nameInput)
    await user.type(nameInput, 'Invalid123')
    await user.tab()

    expect(await screen.findByText(/name should only contain letters/i)).toBeInTheDocument()
  })

  it('allows clearing optional phone field', async () => {
    seedAuth()
    const user = userEvent.setup()
    renderAuthenticated(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /phone/i })).toHaveValue('+15550102030')
    })

    const phoneInput = screen.getByRole('textbox', { name: /phone/i })
    await user.clear(phoneInput)

    const nameInput = screen.getByRole('textbox', { name: /full name/i })
    await user.clear(nameInput)
    await user.type(nameInput, 'New Name')

    const saveBtn = screen.getByRole('button', { name: /save changes/i })
    await waitFor(() => {
      expect(saveBtn).toBeEnabled()
    })
  })

  it('calls updateProfile API on save', async () => {
    seedAuth()
    const user = userEvent.setup()
    renderAuthenticated(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /full name/i })).toHaveValue('Test User')
    })

    const nameInput = screen.getByRole('textbox', { name: /full name/i })
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Name')

    const saveBtn = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveBtn)

    await waitFor(() => {
      expect(screen.getByText(/profile updated/i)).toBeInTheDocument()
    })
  })
})
