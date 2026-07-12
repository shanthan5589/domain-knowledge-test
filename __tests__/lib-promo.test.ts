import {
  PROMO_AD_SLIDE_ENABLED,
  PROMO_AD_SLIDE_URL,
  PROMO_AD_TAG_LABEL,
  PROMO_BADGE_ENABLED,
  PROMO_BADGE_LABEL,
  PROMO_BADGE_URL,
  PROMO_BODY,
  PROMO_BRAND_NAME,
  PROMO_CONTINUE_DELAY_SECONDS,
  PROMO_CONTINUE_LABEL,
  PROMO_CTA_LABEL,
  PROMO_INTERSTITIAL_ENABLED,
  PROMO_INTERSTITIAL_URL,
  PROMO_AD_SLIDE_FACTS,
  PROMO_FACT_ROTATE_INTERVAL_MS,
  PROMO_SKIP_AD_LABEL,
  pickAdSlideTriggerIndex,
  pickInterstitialTriggerIndex,
} from '@/lib/promo'

describe('lib/promo', () => {
  it('exposes three independent boolean switches', () => {
    expect(typeof PROMO_INTERSTITIAL_ENABLED).toBe('boolean')
    expect(typeof PROMO_BADGE_ENABLED).toBe('boolean')
    expect(typeof PROMO_AD_SLIDE_ENABLED).toBe('boolean')
  })

  it('has non-empty copy for every field', () => {
    for (const value of [
      PROMO_BRAND_NAME,
      PROMO_AD_TAG_LABEL,
      PROMO_BODY,
      PROMO_CTA_LABEL,
      PROMO_CONTINUE_LABEL,
      PROMO_BADGE_LABEL,
      PROMO_SKIP_AD_LABEL,
    ]) {
      expect(typeof value).toBe('string')
      expect(value.length).toBeGreaterThan(0)
    }
  })

  it('has at least 2 non-empty rotating facts (a "rotation" of 1 is meaningless)', () => {
    expect(PROMO_AD_SLIDE_FACTS.length).toBeGreaterThanOrEqual(2)
    for (const fact of PROMO_AD_SLIDE_FACTS) {
      expect(typeof fact).toBe('string')
      expect(fact.length).toBeGreaterThan(0)
    }
  })

  it('rotates facts on a positive interval', () => {
    expect(Number.isFinite(PROMO_FACT_ROTATE_INTERVAL_MS)).toBe(true)
    expect(PROMO_FACT_ROTATE_INTERVAL_MS).toBeGreaterThan(0)
  })

  it('builds valid https URLs to castorai.in with the expected UTM params', () => {
    for (const [url, expectedMedium] of [
      [PROMO_INTERSTITIAL_URL, 'quiz_interstitial'],
      [PROMO_BADGE_URL, 'quiz_badge'],
      [PROMO_AD_SLIDE_URL, 'quiz_ad_slide'],
    ] as const) {
      const parsed = new URL(url)
      expect(parsed.protocol).toBe('https:')
      expect(parsed.hostname).toBe('castorai.in')
      expect(parsed.searchParams.get('utm_source')).toBe('edu')
      expect(parsed.searchParams.get('utm_medium')).toBe(expectedMedium)
    }
  })

  it('uses a different utm_medium for the badge vs. the interstitial vs. the ad slide', () => {
    const mediums = [PROMO_INTERSTITIAL_URL, PROMO_BADGE_URL, PROMO_AD_SLIDE_URL].map(
      (url) => new URL(url).searchParams.get('utm_medium')
    )
    expect(new Set(mediums).size).toBe(mediums.length)
  })

  it('gates continue behind a positive, whole number of seconds', () => {
    expect(Number.isInteger(PROMO_CONTINUE_DELAY_SECONDS)).toBe(true)
    expect(PROMO_CONTINUE_DELAY_SECONDS).toBeGreaterThan(0)
  })

  describe('pickInterstitialTriggerIndex', () => {
    it('for a 10-question quiz, always returns an index in {5,6,7,8}', () => {
      for (let i = 0; i < 200; i++) {
        const index = pickInterstitialTriggerIndex(10)
        expect(index).toBeGreaterThanOrEqual(5)
        expect(index).toBeLessThanOrEqual(8)
      }
    })

    it('can produce every value in the valid range, not just one', () => {
      const seen = new Set<number>()
      for (let i = 0; i < 200; i++) {
        seen.add(pickInterstitialTriggerIndex(10))
      }
      expect(seen).toEqual(new Set([5, 6, 7, 8]))
    })

    it('never returns an index for question 5 (index 4) or the last question (index 9)', () => {
      for (let i = 0; i < 200; i++) {
        const index = pickInterstitialTriggerIndex(10)
        expect(index).not.toBe(4)
        expect(index).not.toBe(9)
      }
    })

    it('returns -1 (never fires) for quizzes too short to have a valid trigger point', () => {
      // 6 questions: valid range would be [5, 4], which is empty — the
      // interstitial must never fire on the last question (index 5).
      for (const totalQuestions of [1, 2, 3, 4, 5, 6]) {
        expect(pickInterstitialTriggerIndex(totalQuestions)).toBe(-1)
      }
    })

    it('for a 7-question quiz (the shortest with a valid trigger), only ever returns index 5', () => {
      for (let i = 0; i < 50; i++) {
        expect(pickInterstitialTriggerIndex(7)).toBe(5)
      }
    })
  })

  describe('pickAdSlideTriggerIndex', () => {
    it('for a 10-question quiz, always returns an index in {5,6,7,8}', () => {
      for (let i = 0; i < 200; i++) {
        const index = pickAdSlideTriggerIndex(10)
        expect(index).toBeGreaterThanOrEqual(5)
        expect(index).toBeLessThanOrEqual(8)
      }
    })

    it('can produce every value in the valid range, not just one', () => {
      const seen = new Set<number>()
      for (let i = 0; i < 200; i++) {
        seen.add(pickAdSlideTriggerIndex(10))
      }
      expect(seen).toEqual(new Set([5, 6, 7, 8]))
    })

    it('never returns an index for question 5 (index 4) or the last question (index 9)', () => {
      for (let i = 0; i < 200; i++) {
        const index = pickAdSlideTriggerIndex(10)
        expect(index).not.toBe(4)
        expect(index).not.toBe(9)
      }
    })

    it('returns -1 (never fires) for quizzes too short to have a valid trigger point', () => {
      for (const totalQuestions of [1, 2, 3, 4, 5, 6]) {
        expect(pickAdSlideTriggerIndex(totalQuestions)).toBe(-1)
      }
    })

    it('for a 7-question quiz (the shortest with a valid trigger), only ever returns index 5', () => {
      for (let i = 0; i < 50; i++) {
        expect(pickAdSlideTriggerIndex(7)).toBe(5)
      }
    })
  })
})
