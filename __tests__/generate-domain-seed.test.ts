import fs from 'fs'
import path from 'path'
import { parseSeedSQL, buildDomainSeedSQL, escapeSQLValue } from '@/lib/seed-parser'

// These tests exercise the same building blocks scripts/generate-domain-seed.ts
// uses at runtime (parseSeedSQL + buildDomainSeedSQL), so a passing suite here
// is a strong signal the CLI script itself produces correct SQL.
describe('generate-domain-seed — buildDomainSeedSQL', () => {
  const seedPath = path.join(process.cwd(), 'supabase', 'seed.sql')
  const allRows = parseSeedSQL(seedPath)

  it('includes only the requested domain\'s rows, with the right count', () => {
    const sql = buildDomainSeedSQL('cybersecurity', allRows)
    const expectedCount = allRows.filter((r) => r.domain === 'cybersecurity').length
    expect(expectedCount).toBe(50)

    const dataLines = sql
      .split('\n')
      .filter((line) => line.trim().startsWith("('"))
    expect(dataLines).toHaveLength(expectedCount)
    for (const line of dataLines) {
      expect(line.trim().startsWith("('cybersecurity',")).toBe(true)
    }
  })

  it('starts with a DELETE statement scoped to the requested domain', () => {
    const sql = buildDomainSeedSQL('devops', allRows)
    expect(sql.split('\n')[0]).toBe("DELETE FROM questions WHERE domain = 'devops';")
  })

  it('ends the INSERT statement with a semicolon', () => {
    const sql = buildDomainSeedSQL('cloud', allRows)
    expect(sql.trim().endsWith(';')).toBe(true)
  })

  it('produces well-formed SQL that re-parses back to the same rows (round-trip)', () => {
    const sql = buildDomainSeedSQL('data_science', allRows)
    const expectedRows = allRows.filter((r) => r.domain === 'data_science')

    // Write the generated SQL to a temp file and re-parse it with the same parser
    // used on the real seed.sql — this proves the escaping is correct, not just
    // that it "looks like" SQL.
    const tmpPath = path.join(process.cwd(), '__tests__', '.tmp-generated-seed.sql')
    fs.writeFileSync(tmpPath, sql, 'utf-8')
    try {
      const reparsed = parseSeedSQL(tmpPath)
      expect(reparsed).toEqual(expectedRows)
    } finally {
      fs.unlinkSync(tmpPath)
    }
  })

  it('re-escapes a real apostrophe-containing question correctly (round-trip)', () => {
    // seed.sql line 55 (ai domain) contains ''what/why/how'' — an escaped
    // apostrophe pair on each side of a quoted phrase within the question text.
    const aiRows = allRows.filter((r) => r.domain === 'ai')
    const apostropheRow = aiRows.find((r) => r.question.includes("'what/why/how'"))
    expect(apostropheRow).toBeDefined()

    const sql = buildDomainSeedSQL('ai', allRows)
    // The unescaped single-quote form should appear back as a doubled '' in the SQL.
    expect(sql).toContain("''what/why/how''")
    // And escapeSQLValue in isolation should double every apostrophe.
    expect(escapeSQLValue("'what/why/how'")).toBe("''what/why/how''")
  })

  it('returns an empty tuple list (just DELETE + empty INSERT header) for a domain with no rows', () => {
    const sql = buildDomainSeedSQL('nonexistent-domain', allRows)
    expect(sql).toContain("DELETE FROM questions WHERE domain = 'nonexistent-domain';")
    expect(sql.trim().endsWith(';')).toBe(true)
  })
})
