import fs from 'fs'
import path from 'path'

function readSchemaSQL() {
  return fs.readFileSync(path.join(process.cwd(), 'supabase', 'schema.sql'), 'utf-8')
}

describe('schema.sql — test_results RLS policies', () => {
  let content: string

  beforeAll(() => {
    content = readSchemaSQL()
  })

  it('does not use current_user (the DB role) to scope the SELECT policy', () => {
    // current_user is the connected Postgres role (e.g. the service role),
    // not the requester's JWT email — using it here would not actually
    // restrict rows to their owner.
    expect(content).not.toMatch(/USING\s*\(\s*user_email\s*=\s*current_user\s*\)/i)
  })

  it('scopes the SELECT policy to the requester\'s JWT email', () => {
    expect(content).toMatch(/USING\s*\(\s*user_email\s*=\s*auth\.jwt\(\)\s*->>\s*'email'\s*\)/)
  })

  it('does not allow inserting results under an arbitrary user_email', () => {
    // WITH CHECK (true) on INSERT would let any authenticated request forge
    // a test_results row for any user_email.
    expect(content).not.toMatch(/INSERT[\s\S]{0,80}WITH CHECK\s*\(\s*true\s*\)/i)
  })

  it('scopes the INSERT policy to the requester\'s JWT email', () => {
    expect(content).toMatch(/WITH CHECK\s*\(\s*user_email\s*=\s*auth\.jwt\(\)\s*->>\s*'email'\s*\)/)
  })
})
