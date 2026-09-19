import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { renderAuthenticated } from './render'
import MembersPage from '../pages/Members'
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

describe('Members page', () => {
  it('renders the members heading', async () => {
    seedAuth()
    renderAuthenticated(<MembersPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^members$/i })).toBeInTheDocument()
    })
  })

  it('renders the workspace name in the description', async () => {
    seedAuth()
    renderAuthenticated(<MembersPage />)

    await waitFor(() => {
      expect(screen.getByText(/acme corp/i)).toBeInTheDocument()
    })
  })

  it('renders member stats cards', async () => {
    seedAuth()
    renderAuthenticated(<MembersPage />)

    await waitFor(() => {
      expect(screen.getByText('Total')).toBeInTheDocument()
      expect(screen.getByText('Admins')).toBeInTheDocument()
      expect(screen.getByText('Pending')).toBeInTheDocument()
    })
  })

  it('displays the member roster after loading', async () => {
    seedAuth()
    renderAuthenticated(<MembersPage />)

    await waitFor(() => {
      expect(screen.getAllByText('test@example.com').length).toBeGreaterThan(0)
      expect(screen.getAllByText('jane@example.com').length).toBeGreaterThan(0)
    })
  })

  it('shows role badges for members', async () => {
    seedAuth()
    renderAuthenticated(<MembersPage />)

    await waitFor(() => {
      expect(screen.getAllByText('Admin').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Member').length).toBeGreaterThan(0)
    })
  })

  it('shows status for members', async () => {
    seedAuth()
    renderAuthenticated(<MembersPage />)

    await waitFor(() => {
      expect(screen.getAllByText('Active').length).toBeGreaterThan(0)
    })
  })

  it('shows "you" badge for current user', async () => {
    seedAuth()
    renderAuthenticated(<MembersPage />)

    await waitFor(() => {
      expect(screen.getAllByText('you').length).toBeGreaterThan(0)
    })
  })

  it('renders invite button for admin', async () => {
    seedAuth()
    renderAuthenticated(<MembersPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /invite member/i })).toBeInTheDocument()
    })
  })

  it('opens invite modal when invite button is clicked', async () => {
    seedAuth()
    const user = userEvent.setup()
    renderAuthenticated(<MembersPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /invite member/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /invite member/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /invite a member/i })).toBeInTheDocument()
    })
  })

  it('renders invite form fields in modal', async () => {
    seedAuth()
    const user = userEvent.setup()
    renderAuthenticated(<MembersPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /invite member/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /invite member/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
  })

  it('closes invite modal when cancel is clicked', async () => {
    seedAuth()
    const user = userEvent.setup()
    renderAuthenticated(<MembersPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /invite member/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /invite member/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /invite a member/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /invite a member/i })).not.toBeInTheDocument()
    })
  })

  it('validates email in invite modal', async () => {
    seedAuth()
    const user = userEvent.setup()
    renderAuthenticated(<MembersPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /invite member/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /invite member/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /send invite/i }))

    await waitFor(() => {
      expect(screen.getByText(/please enter your email address/i)).toBeInTheDocument()
    })
  })

  it('validates duplicate email in invite modal', async () => {
    seedAuth()
    const user = userEvent.setup()
    renderAuthenticated(<MembersPage />)

    await waitFor(() => {
      expect(screen.getAllByText('jane@example.com').length).toBeGreaterThan(0)
    })

    await user.click(screen.getByRole('button', { name: /invite member/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/email/i), 'jane@example.com')
    await user.click(screen.getByRole('button', { name: /send invite/i }))

    await waitFor(() => {
      expect(screen.getByText(/already a member/i)).toBeInTheDocument()
    })
  })

  it('sends invite successfully', async () => {
    seedAuth()
    const user = userEvent.setup()
    renderAuthenticated(<MembersPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /invite member/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /invite member/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/email/i), 'newuser@example.com')
    await user.click(screen.getByRole('button', { name: /send invite/i }))

    await waitFor(() => {
      expect(screen.getByText(/invite sent/i)).toBeInTheDocument()
    })
  })

  it('shows remove button for admin on non-self members', async () => {
    seedAuth()
    renderAuthenticated(<MembersPage />)

    await waitFor(() => {
      expect(screen.getAllByText('jane@example.com').length).toBeGreaterThan(0)
    })

    expect(screen.getByRole('button', { name: /remove jane@example.com/i })).toBeInTheDocument()
  })

  it('does not show remove button for self', async () => {
    seedAuth()
    renderAuthenticated(<MembersPage />)

    await waitFor(() => {
      expect(screen.getAllByText('test@example.com').length).toBeGreaterThan(0)
    })

    expect(screen.queryByRole('button', { name: /remove test@example.com/i })).not.toBeInTheDocument()
  })

  it('shows role toggle button for non-self members', async () => {
    seedAuth()
    renderAuthenticated(<MembersPage />)

    await waitFor(() => {
      expect(screen.getAllByText('jane@example.com').length).toBeGreaterThan(0)
    })

    expect(screen.getByRole('button', { name: /make jane@example.com an admin/i })).toBeInTheDocument()
  })

  it('opens confirm dialog when remove is clicked', async () => {
    seedAuth()
    const user = userEvent.setup()
    renderAuthenticated(<MembersPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /remove jane@example.com/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /remove jane@example.com/i }))

    await waitFor(() => {
      expect(screen.getByText(/remove member\?/i)).toBeInTheDocument()
    })
  })

  it('removes member after confirm', async () => {
    seedAuth()
    const user = userEvent.setup()
    renderAuthenticated(<MembersPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /remove jane@example.com/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /remove jane@example.com/i }))

    await waitFor(() => {
      expect(screen.getByText(/remove member\?/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /remove member$/i }))

    await waitFor(() => {
      expect(screen.getByText(/member removed/i)).toBeInTheDocument()
    })
  })

  it('shows admin-only info message', async () => {
    seedAuth()
    renderAuthenticated(<MembersPage />)

    await waitFor(() => {
      expect(screen.getByText(/admin actions are only visible/i)).toBeInTheDocument()
    })
  })
})
