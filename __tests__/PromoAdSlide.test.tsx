import { render, screen, fireEvent, act } from '@testing-library/react'
import PromoAdSlide from '@/components/PromoAdSlide'
import {
  PROMO_AD_SLIDE_FACTS,
  PROMO_AD_SLIDE_URL,
  PROMO_AD_TAG_LABEL,
  PROMO_BRAND_NAME,
  PROMO_CTA_LABEL,
  PROMO_FACT_ROTATE_INTERVAL_MS,
} from '@/lib/promo'

// Matches the component's own (intentionally unexported — it's a timing
// implementation detail, not content) fade duration.
const FADE_DURATION_MS = 200

describe('PromoAdSlide', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders the brand name and ad tag', () => {
    render(<PromoAdSlide />)
    expect(screen.getByText(PROMO_BRAND_NAME)).toBeInTheDocument()
    expect(screen.getByText(PROMO_AD_TAG_LABEL)).toBeInTheDocument()
  })

  it('renders the CTA as an outbound link that opens in a new tab without a referrer', () => {
    render(<PromoAdSlide />)
    const link = screen.getByRole('link', { name: new RegExp(PROMO_CTA_LABEL) })
    expect(link).toHaveAttribute('href', PROMO_AD_SLIDE_URL)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('forces the CTA open via window.open on a plain click, so the quiz tab itself can never navigate away', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null)
    render(<PromoAdSlide />)
    const link = screen.getByRole('link', { name: new RegExp(PROMO_CTA_LABEL) })
    fireEvent.click(link, { button: 0 })
    expect(openSpy).toHaveBeenCalledWith(PROMO_AD_SLIDE_URL, '_blank', 'noopener,noreferrer')
    openSpy.mockRestore()
  })

  it('leaves modifier-key clicks (ctrl/cmd/shift) alone so native "open in new tab" still works', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null)
    render(<PromoAdSlide />)
    const link = screen.getByRole('link', { name: new RegExp(PROMO_CTA_LABEL) })
    fireEvent.click(link, { button: 0, ctrlKey: true })
    expect(openSpy).not.toHaveBeenCalled()
    openSpy.mockRestore()
  })

  it('shows the first fact and a dot indicator per fact', () => {
    render(<PromoAdSlide />)
    expect(screen.getByText(PROMO_AD_SLIDE_FACTS[0])).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Show fact \d+ of \d+/i })).toHaveLength(
      PROMO_AD_SLIDE_FACTS.length
    )
  })

  it('jumps to a fact immediately when its dot is clicked', () => {
    render(<PromoAdSlide />)
    const dots = screen.getAllByRole('button', { name: /Show fact \d+ of \d+/i })
    fireEvent.click(dots[2])
    expect(screen.getByText(PROMO_AD_SLIDE_FACTS[2])).toBeInTheDocument()
    expect(screen.queryByText(PROMO_AD_SLIDE_FACTS[0])).not.toBeInTheDocument()
  })

  // Advancing the rotate interval and the fade duration in one combined jump
  // races the two chained effects (the fade-out effect must re-render and
  // register the fade-in timer before that timer's own target time), so each
  // phase gets its own act() to let React flush in between.
  function advanceOneRotation() {
    act(() => {
      jest.advanceTimersByTime(PROMO_FACT_ROTATE_INTERVAL_MS)
    })
    act(() => {
      jest.advanceTimersByTime(FADE_DURATION_MS)
    })
  }

  it('auto-advances to the next fact once the rotate interval and fade both elapse', () => {
    render(<PromoAdSlide />)
    expect(screen.getByText(PROMO_AD_SLIDE_FACTS[0])).toBeInTheDocument()

    advanceOneRotation()

    expect(screen.getByText(PROMO_AD_SLIDE_FACTS[1])).toBeInTheDocument()
    expect(screen.queryByText(PROMO_AD_SLIDE_FACTS[0])).not.toBeInTheDocument()
  })

  it('wraps back around to the first fact after the last one', () => {
    render(<PromoAdSlide />)
    for (let i = 0; i < PROMO_AD_SLIDE_FACTS.length; i++) {
      advanceOneRotation()
    }
    expect(screen.getByText(PROMO_AD_SLIDE_FACTS[0])).toBeInTheDocument()
  })
})
