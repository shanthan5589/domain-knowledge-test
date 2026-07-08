/**
 * Renders the landing page header for unauthenticated users and checks the
 * mobile sign-in link doesn't wrap against the logo at narrow widths.
 */
import { render, screen } from '@testing-library/react'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))
jest.mock('@/auth', () => ({ auth: jest.fn().mockResolvedValue(null) }))
jest.mock('@/components/HomeSignupForm', () => ({ __esModule: true, default: () => null }))

import Home from '@/app/page'

describe('Landing page header', () => {
  it('shows a short "Sign in" label on mobile and the full label from sm: up, so neither wraps against the logo', async () => {
    const element = await Home()
    render(element as React.ReactElement)

    const header = screen.getByRole('link', { name: /Sign in/ }).closest('header')
    expect(header).toHaveClass('px-4', 'sm:px-8')

    // Short label — visible on mobile, hidden from sm: up
    const shortLabel = screen.getByText('Sign in →')
    expect(shortLabel).toHaveClass('sm:hidden')

    // Full label — hidden on mobile, visible from sm: up, unchanged from the original desktop copy
    const fullLabel = screen.getByText('Sign in to your account →')
    expect(fullLabel).toHaveClass('hidden', 'sm:inline')
  })
})
