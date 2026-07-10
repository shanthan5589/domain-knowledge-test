import { render } from '@testing-library/react'
import PromoBadge from '@/components/PromoBadge'

jest.mock('@/lib/promo', () => ({
  ...jest.requireActual('@/lib/promo'),
  PROMO_BADGE_ENABLED: false,
}))

describe('PromoBadge when disabled', () => {
  it('renders nothing', () => {
    const { container } = render(<PromoBadge />)
    expect(container.firstChild).toBeNull()
  })
})
