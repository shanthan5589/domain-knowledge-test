import fs from 'fs'
import path from 'path'
import type { Domain, CorrectAnswer } from '@/lib/types'

const SEEDS_DIR = path.join(process.cwd(), 'supabase', 'seeds')

const VALID_DOMAINS: Domain[] = ['ai', 'cloud', 'cybersecurity', 'devops', 'data_science']
const VALID_ANSWERS: CorrectAnswer[] = ['A', 'B', 'C', 'D']
const QUESTIONS_PER_DOMAIN: Record<string, number> = {
  ai: 65,
  cloud: 50,
  cybersecurity: 50,
  devops: 50,
  data_science: 50,
}
const TOTAL_QUESTIONS = Object.values(QUESTIONS_PER_DOMAIN).reduce((a, b) => a + b, 0)

// State-machine parser for a SQL VALUES row — handles escaped '' apostrophes correctly
function parseFields(line: string): string[] {
  const fields: string[] = []
  let i = 0

  // Skip leading whitespace and opening paren
  while (i < line.length && line[i] !== '(') i++
  if (line[i] === '(') i++

  while (i < line.length) {
    // Skip commas and whitespace between fields
    while (i < line.length && (line[i] === ' ' || line[i] === ',' || line[i] === '\t')) i++

    if (line[i] === ')' || i >= line.length) break

    if (line[i] !== "'") { i++; continue }

    // Parse single-quoted field
    i++ // skip opening quote
    let value = ''
    while (i < line.length) {
      if (line[i] === "'" && line[i + 1] === "'") {
        value += "'"
        i += 2
      } else if (line[i] === "'") {
        i++ // skip closing quote
        break
      } else {
        value += line[i]
        i++
      }
    }
    fields.push(value)
  }

  return fields
}

function parseSeedSQL() {
  const seedPath = path.join(process.cwd(), 'supabase', 'seed.sql')
  const content = fs.readFileSync(seedPath, 'utf-8')

  const rows: {
    domain: string
    question: string
    option_a: string
    option_b: string
    option_c: string
    option_d: string
    correct_answer: string
  }[] = []

  for (const line of content.split('\n')) {
    const trimmed = line.trim()

    // Only process lines that start as a question row
    const isDomainRow = VALID_DOMAINS.some((d) => trimmed.startsWith(`('${d}',`))
    if (!isDomainRow) continue

    const fields = parseFields(trimmed)
    if (fields.length < 7) continue

    rows.push({
      domain: fields[0],
      question: fields[1],
      option_a: fields[2],
      option_b: fields[3],
      option_c: fields[4],
      option_d: fields[5],
      correct_answer: fields[6],
    })
  }

  return rows
}

describe('Seed SQL validation', () => {
  let questions: ReturnType<typeof parseSeedSQL>

  beforeAll(() => {
    questions = parseSeedSQL()
  })

  it('seed.sql file exists', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'supabase', 'seed.sql'))).toBe(true)
  })

  it('schema.sql file exists', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'supabase', 'schema.sql'))).toBe(true)
  })

  it(`parses exactly ${TOTAL_QUESTIONS} questions total`, () => {
    expect(questions).toHaveLength(TOTAL_QUESTIONS)
  })

  it('has the correct question count per domain', () => {
    for (const domain of VALID_DOMAINS) {
      const count = questions.filter((q) => q.domain === domain).length
      expect(count).toBe(QUESTIONS_PER_DOMAIN[domain])
    }
  })

  it('all domains are valid', () => {
    for (const q of questions) {
      expect(VALID_DOMAINS).toContain(q.domain)
    }
  })

  it('all correct_answer values are A, B, C, or D', () => {
    for (const q of questions) {
      expect(VALID_ANSWERS).toContain(q.correct_answer as CorrectAnswer)
    }
  })

  it('no question text is empty', () => {
    for (const q of questions) {
      expect(q.question.trim().length).toBeGreaterThan(0)
    }
  })

  it('no option is empty', () => {
    for (const q of questions) {
      expect(q.option_a.trim().length).toBeGreaterThan(0)
      expect(q.option_b.trim().length).toBeGreaterThan(0)
      expect(q.option_c.trim().length).toBeGreaterThan(0)
      expect(q.option_d.trim().length).toBeGreaterThan(0)
    }
  })

  it('all four options are distinct per question', () => {
    for (const q of questions) {
      const opts = new Set([q.option_a, q.option_b, q.option_c, q.option_d])
      expect(opts.size).toBe(4)
    }
  })

  it('no duplicate question texts within a domain', () => {
    for (const domain of VALID_DOMAINS) {
      const texts = questions.filter((q) => q.domain === domain).map((q) => q.question)
      expect(new Set(texts).size).toBe(texts.length)
    }
  })

  it('answer distribution — no single answer exceeds 50% of any domain', () => {
    for (const domain of VALID_DOMAINS) {
      const answers = questions.filter((q) => q.domain === domain).map((q) => q.correct_answer)
      const domainTotal = answers.length
      for (const ans of VALID_ANSWERS) {
        const count = answers.filter((a) => a === ans).length
        expect(count).toBeLessThan(domainTotal * 0.5)
      }
    }
  })
})

describe('Seed domain files', () => {
  it('each domain has a seed file in supabase/seeds/', () => {
    for (const domain of ['ai', 'cloud', 'cybersecurity', 'devops', 'data_science']) {
      expect(fs.existsSync(path.join(SEEDS_DIR, `${domain}.sql`))).toBe(true)
    }
  })

  it('each domain file contains only rows for that domain', () => {
    const otherDomains = ['ai', 'cloud', 'cybersecurity', 'devops', 'data_science']
    for (const domain of otherDomains) {
      const content = fs.readFileSync(path.join(SEEDS_DIR, `${domain}.sql`), 'utf8')
      for (const line of content.split('\n')) {
        if (!line.trim().startsWith('(')) continue
        expect(line.trim()).toMatch(new RegExp(`^\\('${domain}',`))
      }
    }
  })

  it('domain file row counts match QUESTIONS_PER_DOMAIN', () => {
    for (const [domain, expected] of Object.entries(QUESTIONS_PER_DOMAIN)) {
      const content = fs.readFileSync(path.join(SEEDS_DIR, `${domain}.sql`), 'utf8')
      const count = content.split('\n').filter((l) => l.trim().startsWith("('")).length
      expect(count).toBe(expected)
    }
  })

  it('build script exists', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'scripts', 'build-seed.js'))).toBe(true)
  })
})
