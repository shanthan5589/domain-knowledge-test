import { ALL_DOMAINS, DOMAIN_LABELS, DOMAIN_LABELS_SHORT } from '@/lib/domains'

const EXPECTED_DOMAINS = ['ai', 'cloud', 'cybersecurity', 'devops', 'data_science']

describe('lib/domains', () => {
  it('ALL_DOMAINS has exactly the 5 expected domain codes', () => {
    expect(ALL_DOMAINS).toEqual(EXPECTED_DOMAINS)
  })

  it('DOMAIN_LABELS has a label for every domain', () => {
    for (const domain of ALL_DOMAINS) {
      expect(typeof DOMAIN_LABELS[domain]).toBe('string')
      expect(DOMAIN_LABELS[domain].length).toBeGreaterThan(0)
    }
  })

  it('DOMAIN_LABELS_SHORT has a label for every domain', () => {
    for (const domain of ALL_DOMAINS) {
      expect(typeof DOMAIN_LABELS_SHORT[domain]).toBe('string')
      expect(DOMAIN_LABELS_SHORT[domain].length).toBeGreaterThan(0)
    }
  })
})
