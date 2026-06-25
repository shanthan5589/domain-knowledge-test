import { render, screen, fireEvent } from '@testing-library/react'
import LogoutButton from '@/components/LogoutButton'

const mockSignOut = jest.fn()

jest.mock('next-auth/react', () => ({
  signOut: (opts: unknown) => mockSignOut(opts),
}))

describe('LogoutButton', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders a Log out button', () => {
    render(<LogoutButton />)
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument()
  })

  it('calls signOut with callbackUrl / when clicked', () => {
    render(<LogoutButton />)
    fireEvent.click(screen.getByRole('button', { name: /log out/i }))
    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/' })
  })
})
