import { render, screen } from '@testing-library/react'
import PromoBadge from '@/components/PromoBadge'
import { PROMO_BADGE_LABEL, PROMO_BADGE_URL } from '@/lib/promo'

// Badge defaults to off in lib/promo.ts — opt it in explicitly so this test
// exercises the enabled rendering path regardless of the current default.
jest.mock('@/lib/promo', () => ({
  ...jest.requireActual('@/lib/promo'),
  PROMO_BADGE_ENABLED: true,
}))

describe('PromoBadge', () => {
  it('renders the badge label with the correct outbound link attributes when enabled', () => {
    render(<PromoBadge />)
    const link = screen.getByRole('link', { name: PROMO_BADGE_LABEL })
    expect(link).toHaveAttribute('href', PROMO_BADGE_URL)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
