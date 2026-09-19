import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { renderAuthenticated } from './render'
import OrganizationSettingsPage from '../pages/OrganizationSettings'
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

describe('OrganizationSettings page', () => {
  it('renders the organization settings heading', async () => {
    seedAuth()
    renderAuthenticated(<OrganizationSettingsPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /organization settings/i })).toBeInTheDocument()
    })
  })

  it('renders the org name in the description', async () => {
    seedAuth()
    renderAuthenticated(<OrganizationSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText(/acme corp/i)).toBeInTheDocument()
    })
  })

  it('renders general information section for admin', async () => {
    seedAuth()
    renderAuthenticated(<OrganizationSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText(/general information/i)).toBeInTheDocument()
    })
  })

  it('renders editable form fields for admin', async () => {
    seedAuth()
    renderAuthenticated(<OrganizationSettingsPage />)

    await waitFor(() => {
      expect(screen.getByLabelText(/organization name/i)).toHaveValue('Acme Corp')
    })
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
  })

  it('renders save and cancel buttons for admin', async () => {
    seedAuth()
    renderAuthenticated(<OrganizationSettingsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('disables save button when form is not dirty', async () => {
    seedAuth()
    renderAuthenticated(<OrganizationSettingsPage />)

    await waitFor(() => {
      expect(screen.getByLabelText(/organization name/i)).toHaveValue('Acme Corp')
    })

    const saveBtn = screen.getByRole('button', { name: /save changes/i })
    expect(saveBtn).toBeDisabled()
  })

  it('enables save button when org name is changed', async () => {
    seedAuth()
    const user = userEvent.setup()
    renderAuthenticated(<OrganizationSettingsPage />)

    await waitFor(() => {
      expect(screen.getByLabelText(/organization name/i)).toHaveValue('Acme Corp')
    })

    const nameInput = screen.getByLabelText(/organization name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'New Corp Name')

    const saveBtn = screen.getByRole('button', { name: /save changes/i })
    await waitFor(() => {
      expect(saveBtn).toBeEnabled()
    })
  })

  it('shows validation error for invalid org name characters', async () => {
    seedAuth()
    const user = userEvent.setup()
    renderAuthenticated(<OrganizationSettingsPage />)

    await waitFor(() => {
      expect(screen.getByLabelText(/organization name/i)).toHaveValue('Acme Corp')
    })

    const nameInput = screen.getByLabelText(/organization name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Org@#$')
    await user.tab()

    expect(await screen.findByText(/letters, numbers, spaces/i)).toBeInTheDocument()
  })

  it('resets form when cancel is clicked', async () => {
    seedAuth()
    const user = userEvent.setup()
    renderAuthenticated(<OrganizationSettingsPage />)

    await waitFor(() => {
      expect(screen.getByLabelText(/organization name/i)).toHaveValue('Acme Corp')
    })

    const nameInput = screen.getByLabelText(/organization name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Changed Name')

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.getByLabelText(/organization name/i)).toHaveValue('Acme Corp')
  })

  it('saves org info changes', async () => {
    seedAuth()
    const user = userEvent.setup()
    renderAuthenticated(<OrganizationSettingsPage />)

    await waitFor(() => {
      expect(screen.getByLabelText(/organization name/i)).toHaveValue('Acme Corp')
    })

    const nameInput = screen.getByLabelText(/organization name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Corp')

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByText(/organization updated/i)).toBeInTheDocument()
    })
  })

  it('renders branding section', async () => {
    seedAuth()
    renderAuthenticated(<OrganizationSettingsPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^branding$/i })).toBeInTheDocument()
    })
  })

  it('renders the logo upload button for admin', async () => {
    seedAuth()
    renderAuthenticated(<OrganizationSettingsPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^branding$/i })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /save logo/i })).toBeInTheDocument()
  })

  it('renders leave organization section', async () => {
    seedAuth()
    renderAuthenticated(<OrganizationSettingsPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^leave organization$/i })).toBeInTheDocument()
    })
  })

  it('shows role badge for current user', async () => {
    seedAuth()
    renderAuthenticated(<OrganizationSettingsPage />)

    await waitFor(() => {
      const youAreElements = screen.getAllByText(/you are/i)
      expect(youAreElements.length).toBeGreaterThan(0)
    })
  })
})
