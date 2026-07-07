// Generates a ready-to-paste SQL snippet that replaces ONE domain's questions
// without touching any other domain — safer than re-running the whole
// supabase/seed.sql file, which wipes and reinserts every domain.
//
// Usage: npm run seed:domain -- <domain>
//   e.g. npm run seed:domain -- ai
//
// This prints SQL to stdout. Copy it and paste it into the Supabase SQL Editor.
//
// Note: relative imports (not the @/ alias) are used here on purpose — this
// file runs directly under ts-node, outside of Next.js's bundler, which does
// not know about the @/ path alias.
import path from 'path'
import { parseSeedSQL, buildDomainSeedSQL } from '../lib/seed-parser'
import { ALL_DOMAINS } from '../lib/domains'

function printUsageAndExit(): never {
  console.error('Usage: npm run seed:domain -- <domain>')
  console.error(`Valid domains: ${ALL_DOMAINS.join(', ')}`)
  process.exit(1)
}

function main() {
  const domain = process.argv[2]

  if (!domain || !ALL_DOMAINS.includes(domain as (typeof ALL_DOMAINS)[number])) {
    printUsageAndExit()
  }

  const seedPath = path.join(process.cwd(), 'supabase', 'seed.sql')
  const rows = parseSeedSQL(seedPath)
  const sql = buildDomainSeedSQL(domain, rows)

  console.log(sql)
}

main()
