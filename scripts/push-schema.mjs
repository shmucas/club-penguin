// Applies db/schema.sql to the database in DATABASE_URL. Safe to re-run.
//   npm run db:push
import { readFileSync } from 'node:fs'
import { Client } from 'pg'

/** Minimal .env.local reader, so the script needs no extra dependency. */
function loadEnv(file) {
  try {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
      }
    }
  } catch {
    // No .env.local: fall back to whatever is already in the environment.
  }
}

loadEnv('.env.local')

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set. Put it in .env.local (see .env.example).')
  process.exit(1)
}

const client = new Client({ connectionString: url })
await client.connect()
try {
  await client.query(readFileSync('db/schema.sql', 'utf8'))
  const { rows } = await client.query('select count(*)::int as items from items')
  console.log(`Schema applied. ${rows[0].items} items in the catalogue.`)
} finally {
  await client.end()
}
