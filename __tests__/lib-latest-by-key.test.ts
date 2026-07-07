import { latestByKey } from '@/lib/latest-by-key'

describe('lib/latest-by-key', () => {
  it('returns an empty map for empty input', () => {
    const result = latestByKey<{ id: string }, string>([], (row) => row.id)
    expect(result.size).toBe(0)
  })

  it('returns a single entry for a single row', () => {
    const row = { id: 'a', value: 1 }
    const result = latestByKey([row], (r) => r.id)
    expect(result.size).toBe(1)
    expect(result.get('a')).toBe(row)
  })

  it('keeps only the first-seen row per key when multiple rows share a key', () => {
    const rows = [
      { email: 'a@example.com', score: 9, completed_at: '2026-01-03' },
      { email: 'b@example.com', score: 4, completed_at: '2026-01-02' },
      { email: 'a@example.com', score: 7, completed_at: '2026-01-01' },
    ]

    const result = latestByKey(rows, (row) => row.email)

    expect(result.size).toBe(2)
    // First-seen row for 'a' wins — its later (older) duplicate is ignored.
    expect(result.get('a@example.com')).toEqual({
      email: 'a@example.com',
      score: 9,
      completed_at: '2026-01-03',
    })
    expect(result.get('b@example.com')).toEqual({
      email: 'b@example.com',
      score: 4,
      completed_at: '2026-01-02',
    })
  })

  it('preserves insertion order based on first occurrence', () => {
    const rows = [
      { key: 'x', n: 1 },
      { key: 'y', n: 2 },
      { key: 'x', n: 3 },
      { key: 'z', n: 4 },
    ]

    const result = latestByKey(rows, (row) => row.key)

    expect([...result.keys()]).toEqual(['x', 'y', 'z'])
  })
})
