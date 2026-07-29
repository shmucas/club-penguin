import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from './_lib/db'

/** Quick check that the function and the database are both reachable. */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const rows = (await sql`select count(*)::int as penguins from profiles`) as unknown as Array<{
      penguins: number
    }>
    res.status(200).json({ ok: true, penguins: rows[0]?.penguins ?? 0 })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, error: 'Database unreachable' })
  }
}
