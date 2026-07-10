import { render, screen, fireEvent, act } from '@testing-library/react'
import PromoInterstitial from '@/components/PromoInterstitial'
import {
  PROMO_AD_TAG_LABEL,
  PROMO_BODY,
  PROMO_BRAND_NAME,
  PROMO_CONTINUE_DELAY_SECONDS,
  PROMO_CONTINUE_LABEL,
  PROMO_CTA_LABEL,
  PROMO_INTERSTITIAL_URL,
} from '@/lib/promo'

describe('PromoInterstitial', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders the brand name, ad tag, and body from lib/promo', () => {
    render(<PromoInterstitial onContinue={jest.fn()} />)
    expect(screen.getByText(PROMO_BRAND_NAME)).toBeInTheDocument()
    expect(screen.getByText(PROMO_AD_TAG_LABEL)).toBeInTheDocument()
    expect(screen.getByText(PROMO_BODY)).toBeInTheDocument()
  })

  it('renders the CTA as an outbound link that opens in a new tab without a referrer, unaffected by the continue delay', () => {
    render(<PromoInterstitial onContinue={jest.fn()} />)
    const link = screen.getByRole('link', { name: new RegExp(PROMO_CTA_LABEL) })
    expect(link).toHaveAttribute('href', PROMO_INTERSTITIAL_URL)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('disables continue and shows a countdown until the delay elapses', () => {
    render(<PromoInterstitial onContinue={jest.fn()} />)
    const button = screen.getByRole('button', { name: new RegExp(PROMO_CONTINUE_LABEL) })
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent(`${PROMO_CONTINUE_LABEL} (${PROMO_CONTINUE_DELAY_SECONDS}s)`)
  })

  it('does not call onContinue while the continue button is still disabled', () => {
    const onContinue = jest.fn()
    render(<PromoInterstitial onContinue={onContinue} />)
    fireEvent.click(screen.getByRole('button', { name: new RegExp(PROMO_CONTINUE_LABEL) }))
    expect(onContinue).not.toHaveBeenCalled()
  })

  it('enables continue once the delay elapses and calls onContinue when clicked', () => {
    const onContinue = jest.fn()
    render(<PromoInterstitial onContinue={onContinue} />)
    // Advance one second at a time — the countdown is a recursive setTimeout
    // driven by a state update each tick, so a single big jump doesn't let
    // React re-render and schedule the next timer in between.
    for (let i = 0; i < PROMO_CONTINUE_DELAY_SECONDS; i++) {
      act(() => {
        jest.advanceTimersByTime(1000)
      })
    }
    const button = screen.getByRole('button', { name: PROMO_CONTINUE_LABEL })
    expect(button).not.toBeDisabled()
    fireEvent.click(button)
    expect(onContinue).toHaveBeenCalledTimes(1)
  })
})
