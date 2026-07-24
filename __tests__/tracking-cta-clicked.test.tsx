jest.mock('@/lib/analytics', () => ({ trackEvent: jest.fn() }))
// Enable the badge so it renders (the ad slide and interstitial always render
// their own markup regardless of this flag).
jest.mock('@/lib/promo', () => ({
  ...jest.requireActual('@/lib/promo'),
  PROMO_BADGE_ENABLED: true,
}))

import { render, screen, fireEvent } from '@testing-library/react'
import PromoAdSlide from '@/components/PromoAdSlide'
import PromoInterstitial from '@/components/PromoInterstitial'
import PromoBadge from '@/components/PromoBadge'
import { trackEvent } from '@/lib/analytics'

const mockTrackEvent = trackEvent as jest.Mock

describe('Castor CTA tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.open = jest.fn()
  })

  it('fires cta_clicked (quiz_ad_slide) when the ad-slide CTA is clicked', () => {
    render(<PromoAdSlide />)
    fireEvent.click(screen.getByText(/See how/i))
    expect(mockTrackEvent).toHaveBeenCalledWith('cta_clicked', { location: 'quiz_ad_slide', brand: 'castor' })
  })

  it('fires cta_clicked (quiz_interstitial) when the interstitial CTA is clicked', () => {
    render(<PromoInterstitial onContinue={() => {}} />)
    fireEvent.click(screen.getByText(/See how/i))
    expect(mockTrackEvent).toHaveBeenCalledWith('cta_clicked', { location: 'quiz_interstitial', brand: 'castor' })
  })

  it('fires cta_clicked (quiz_badge) when the badge is clicked', () => {
    render(<PromoBadge />)
    fireEvent.click(screen.getByText('Powered by Castor AI'))
    expect(mockTrackEvent).toHaveBeenCalledWith('cta_clicked', { location: 'quiz_badge', brand: 'castor' })
  })
})
