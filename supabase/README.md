# Supabase Setup & Data Workflow

This folder holds all the SQL used to set up and maintain the database for
this project. This README explains, in plain terms, what to run and when.

## 1. Fresh install (brand new database)

Run these files in the Supabase SQL Editor, **in this exact order**:

1. `profiles.sql` — creates the `profiles` table (users, both Google and
   credentials login).
2. `schema.sql` — creates the `questions` and `test_results` tables. This
   must run after `profiles.sql` because `test_results` has a foreign key
   into `profiles`.
3. `seed.sql` — fills the `questions` table with all 265 starter questions
   (65 AI + 50 each for Cloud, Cybersecurity, DevOps, Data Science).
4. Any `migration-*.sql` files present in this folder — run each one once,
   in the Supabase SQL Editor. These apply one-off schema/data changes made
   after the initial launch (see "Migrations" below).

After that, the database is ready to use.

## 2. Updating questions for ONE domain (without touching the others)

This is the most common day-to-day task, so read this section carefully.

**The problem:** `seed.sql` contains a single `TRUNCATE TABLE questions` plus
one giant `INSERT` for *all five domains at once*. If you just fix a typo in
one Cloud question and re-run the whole `seed.sql` file, it wipes and
reinserts every domain's questions — including AI, Cybersecurity, DevOps, and
Data Science, none of which you meant to touch.

**Do NOT re-run the whole `seed.sql` file to fix one domain.** That wipes
every domain's questions, not just the one you're editing.

**The safe workflow instead:**

1. Open `supabase/seed.sql` and find the section for the domain you want to
   change. Each domain has a clearly marked comment header, e.g.:
   ```sql
   -- ============================================================
   -- AI / GenAI (65)
   -- ============================================================
   ```
   Edit the question rows directly inside that section (fix the typo, change
   an option, add or remove a question, etc). Leave every other domain's
   section untouched.

2. Run the generator script to turn just that domain's rows into a safe,
   self-contained SQL snippet:
   ```bash
   npm run seed:domain -- ai
   ```
   Replace `ai` with whichever domain you edited. Valid domain codes are:
   `ai`, `cloud`, `cybersecurity`, `devops`, `data_science`.

3. The script prints SQL to your terminal that looks like this:
   ```sql
   DELETE FROM questions WHERE domain = 'ai';

   INSERT INTO questions (domain, question, option_a, option_b, option_c, option_d, correct_answer) VALUES
   ('ai','...','...','...','...','...','C'),
   ...
   ;
   ```
   Copy this output and paste it into the Supabase SQL Editor, then run it.
   It only deletes and reinserts rows for the one domain you picked — every
   other domain's questions are left completely alone.

This works because the script reads the current `supabase/seed.sql` file
(so it always reflects your latest edits), filters to just the domain you
asked for, and re-escapes the text correctly for SQL (so apostrophes in
questions like `"user's"` don't break anything).

## 3. Demo data (for local testing of the Stats page)

- `demo-community-data.sql` — inserts a batch of fake "community" users and
  test results. Use this when working on the Stats/leaderboard page locally
  and you want realistic-looking charts and rankings without waiting for
  real users to take tests.
- `demo-community-data-cleanup.sql` — removes exactly the fake data that
  `demo-community-data.sql` added, leaving real user data untouched. Run
  this when you're done testing, or before deploying to production.

## 4. Migrations

`migration-*.sql` files are one-off scripts for schema or data changes made
after the initial `schema.sql`/`profiles.sql`/`seed.sql` setup (for example,
adding new profile fields, or replacing a domain's question set). Run each
migration file once, in the Supabase SQL Editor, in the order it was added,
after the base `schema.sql` and `profiles.sql` have already been applied.

Current migrations:

- `migration-profile-fields.sql` — adds location, experience, designation,
  and LinkedIn fields to `profiles`.
- `migration-location-ip-fields.sql` — replaces the old free-text location
  field with structured country/state/city fields.
- `migration-replace-ai-questions.sql` — a one-time replacement of the AI
  domain's questions (50 old questions swapped for 65 new ones). This is the
  same kind of DELETE + INSERT pattern that `npm run seed:domain` now
  generates automatically for any domain.
