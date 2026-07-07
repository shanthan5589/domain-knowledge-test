import fs from 'fs'
import path from 'path'
import type { CorrectAnswer } from '@/lib/types'
import { ALL_DOMAINS as VALID_DOMAINS } from '@/lib/domains'
import { parseFields, parseSeedSQL } from '@/lib/seed-parser'

const VALID_ANSWERS: CorrectAnswer[] = ['A', 'B', 'C', 'D']
const QUESTIONS_PER_DOMAIN: Record<string, number> = {
  ai: 65,
  cloud: 50,
  cybersecurity: 50,
  devops: 50,
  data_science: 50,
}
const TOTAL_QUESTIONS = Object.values(QUESTIONS_PER_DOMAIN).reduce((a, b) => a + b, 0)
const MIN_QUESTION_LENGTH = 20
const MIN_OPTION_LENGTH = 2

describe('Seed SQL — file structure', () => {
  it('seed.sql exists', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'supabase', 'seed.sql'))).toBe(true)
  })

  it('schema.sql exists', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'supabase', 'schema.sql'))).toBe(true)
  })

  it('seed.sql contains TRUNCATE TABLE statement', () => {
    const content = fs.readFileSync(path.join(process.cwd(), 'supabase', 'seed.sql'), 'utf-8')
    expect(content).toMatch(/TRUNCATE TABLE questions/i)
  })

  it('seed.sql contains INSERT INTO statement', () => {
    const content = fs.readFileSync(path.join(process.cwd(), 'supabase', 'seed.sql'), 'utf-8')
    expect(content).toMatch(/INSERT INTO questions/i)
  })

  it('seed.sql has a section header for every domain', () => {
    const content = fs.readFileSync(path.join(process.cwd(), 'supabase', 'seed.sql'), 'utf-8')
    const domainLabels = ['AI', 'Cloud', 'Cybersecurity', 'DevOps', 'Data Science']
    for (const label of domainLabels) {
      expect(content).toContain(label)
    }
  })
})

describe('Seed SQL — question counts', () => {
  let questions: ReturnType<typeof parseSeedSQL>

  beforeAll(() => { questions = parseSeedSQL() })

  it(`total is exactly ${TOTAL_QUESTIONS}`, () => {
    expect(questions).toHaveLength(TOTAL_QUESTIONS)
  })

  it.each(Object.entries(QUESTIONS_PER_DOMAIN))(
    '%s domain has exactly %i questions',
    (domain, expected) => {
      const count = questions.filter((q) => q.domain === domain).length
      expect(count).toBe(expected)
    }
  )
})

describe('Seed SQL — data integrity', () => {
  let questions: ReturnType<typeof parseSeedSQL>

  beforeAll(() => { questions = parseSeedSQL() })

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

  it(`every question is at least ${MIN_QUESTION_LENGTH} characters`, () => {
    for (const q of questions) {
      expect(q.question.trim().length).toBeGreaterThanOrEqual(MIN_QUESTION_LENGTH)
    }
  })

  it(`every option is at least ${MIN_OPTION_LENGTH} characters`, () => {
    for (const q of questions) {
      expect(q.option_a.trim().length).toBeGreaterThanOrEqual(MIN_OPTION_LENGTH)
      expect(q.option_b.trim().length).toBeGreaterThanOrEqual(MIN_OPTION_LENGTH)
      expect(q.option_c.trim().length).toBeGreaterThanOrEqual(MIN_OPTION_LENGTH)
      expect(q.option_d.trim().length).toBeGreaterThanOrEqual(MIN_OPTION_LENGTH)
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
      const unique = new Set(texts)
      expect(unique.size).toBe(texts.length)
    }
  })

  it('no field contains an unescaped SQL single-quote (would break INSERT)', () => {
    const seedContent = fs.readFileSync(path.join(process.cwd(), 'supabase', 'seed.sql'), 'utf-8')
    // Every data row must parse back to exactly 7 fields — if a raw ' broke the parser it returns fewer
    for (const line of seedContent.split('\n')) {
      const trimmed = line.trim()
      if (!VALID_DOMAINS.some((d) => trimmed.startsWith(`('${d}',`))) continue
      const fields = parseFields(trimmed)
      expect(fields.length).toBe(7)
    }
  })
})

describe('Seed SQL — answer distribution', () => {
  let questions: ReturnType<typeof parseSeedSQL>

  beforeAll(() => { questions = parseSeedSQL() })

  it('every domain has at least one question with each answer letter (A/B/C/D)', () => {
    for (const domain of VALID_DOMAINS) {
      const answers = questions.filter((q) => q.domain === domain).map((q) => q.correct_answer)
      for (const ans of VALID_ANSWERS) {
        expect(answers).toContain(ans)
      }
    }
  })

  it('no single answer letter exceeds 50% within any domain', () => {
    for (const domain of VALID_DOMAINS) {
      const answers = questions.filter((q) => q.domain === domain).map((q) => q.correct_answer)
      for (const ans of VALID_ANSWERS) {
        const count = answers.filter((a) => a === ans).length
        expect(count).toBeLessThan(answers.length * 0.5)
      }
    }
  })
})
