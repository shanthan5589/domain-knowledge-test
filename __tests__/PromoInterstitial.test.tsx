import { render, screen, fireEvent } from '@testing-library/react'
import PromoInterstitial from '@/components/PromoInterstitial'
import { PROMO_BODY, PROMO_CTA_LABEL, PROMO_EYEBROW, PROMO_INTERSTITIAL_URL, PROMO_LINK_LABEL } from '@/lib/promo'

describe('PromoInterstitial', () => {
  it('renders the eyebrow, body, and CTA from lib/promo', () => {
    render(<PromoInterstitial onContinue={jest.fn()} />)
    expect(screen.getByText(PROMO_EYEBROW)).toBeInTheDocument()
    expect(screen.getByText(PROMO_BODY)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: PROMO_CTA_LABEL })).toBeInTheDocument()
  })

  it('renders an outbound link that opens in a new tab without a referrer', () => {
    render(<PromoInterstitial onContinue={jest.fn()} />)
    const link = screen.getByRole('link', { name: new RegExp(PROMO_LINK_LABEL) })
    expect(link).toHaveAttribute('href', PROMO_INTERSTITIAL_URL)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('calls onContinue exactly once when the CTA is clicked', () => {
    const onContinue = jest.fn()
    render(<PromoInterstitial onContinue={onContinue} />)
    fireEvent.click(screen.getByRole('button', { name: PROMO_CTA_LABEL }))
    expect(onContinue).toHaveBeenCalledTimes(1)
  })
})
