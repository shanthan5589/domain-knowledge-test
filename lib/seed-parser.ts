import fs from 'fs'
import path from 'path'
import type { Domain } from './types'
import { ALL_DOMAINS } from './domains'

// A single question row as parsed out of supabase/seed.sql.
export interface SeedRow {
  domain: string
  question: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
}

// State-machine parser for a SQL VALUES row — handles escaped '' apostrophes correctly.
// Given a line like `('ai','question text with an escaped '' quote',...),` this returns
// the unescaped string fields in order: ['ai', "question text with an escaped ' quote", ...].
export function parseFields(line: string): string[] {
  const fields: string[] = []
  let i = 0

  while (i < line.length && line[i] !== '(') i++
  if (line[i] === '(') i++

  while (i < line.length) {
    while (i < line.length && (line[i] === ' ' || line[i] === ',' || line[i] === '\t')) i++
    if (line[i] === ')' || i >= line.length) break
    if (line[i] !== "'") { i++; continue }

    i++
    let value = ''
    while (i < line.length) {
      if (line[i] === "'" && line[i + 1] === "'") {
        value += "'"; i += 2
      } else if (line[i] === "'") {
        i++; break
      } else {
        value += line[i]; i++
      }
    }
    fields.push(value)
  }

  return fields
}

// Reads and parses supabase/seed.sql, returning every question row it finds
// across all domains. Used both by tests (to validate the seed data) and by
// scripts/generate-domain-seed.ts (to regenerate a single domain's INSERT).
export function parseSeedSQL(seedPath?: string): SeedRow[] {
  const resolvedPath = seedPath ?? path.join(process.cwd(), 'supabase', 'seed.sql')
  const content = fs.readFileSync(resolvedPath, 'utf-8')
  const rows: SeedRow[] = []

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!ALL_DOMAINS.some((d: Domain) => trimmed.startsWith(`('${d}',`))) continue
    const fields = parseFields(trimmed)
    if (fields.length < 7) continue
    rows.push({
      domain: fields[0], question: fields[1],
      option_a: fields[2], option_b: fields[3],
      option_c: fields[4], option_d: fields[5],
      correct_answer: fields[6],
    })
  }

  return rows
}

// Re-escapes a single value for use inside a SQL string literal — the inverse
// of the unescaping parseFields performs. A literal ' becomes '' again.
export function escapeSQLValue(value: string): string {
  return value.replace(/'/g, "''")
}

// Builds a ready-to-paste SQL snippet that replaces just one domain's
// questions: a DELETE for that domain followed by a fresh INSERT containing
// only its rows. Pasting this into the Supabase SQL Editor updates a single
// domain without touching any other domain's questions.
export function buildDomainSeedSQL(domain: string, rows: SeedRow[]): string {
  const domainRows = rows.filter((r) => r.domain === domain)

  const tuples = domainRows.map((r) => {
    const values = [
      r.domain,
      r.question,
      r.option_a,
      r.option_b,
      r.option_c,
      r.option_d,
      r.correct_answer,
    ].map((v) => `'${escapeSQLValue(v)}'`)
    return `(${values.join(',')})`
  })

  const lines = [
    `DELETE FROM questions WHERE domain = '${domain}';`,
    '',
    'INSERT INTO questions (domain, question, option_a, option_b, option_c, option_d, correct_answer) VALUES',
    `${tuples.join(',\n')};`,
  ]

  return lines.join('\n')
}
