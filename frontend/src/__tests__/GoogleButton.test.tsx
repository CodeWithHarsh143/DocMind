import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { renderWithProviders } from './render'
import { GoogleButton } from '../components/auth/GoogleButton'
import { handlers } from './handlers'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('GoogleButton', () => {
  it('renders the Google sign-in button', () => {
    renderWithProviders(<GoogleButton />)
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
  })

  it('renders the Google SVG icon', () => {
    renderWithProviders(<GoogleButton />)
    const button = screen.getByRole('button', { name: /continue with google/i })
    expect(button.querySelector('svg')).toBeInTheDocument()
  })

  it('is disabled when no client ID is configured', () => {
    renderWithProviders(<GoogleButton />)
    const button = screen.getByRole('button', { name: /continue with google/i })
    expect(button).toBeDisabled()
  })

  it('can be explicitly disabled', () => {
    renderWithProviders(<GoogleButton disabled />)
    const button = screen.getByRole('button', { name: /continue with google/i })
    expect(button).toBeDisabled()
  })

  it('does not show error message when no load error', () => {
    renderWithProviders(<GoogleButton />)
    expect(screen.queryByText(/google sign-in could not be loaded/i)).not.toBeInTheDocument()
  })
})
