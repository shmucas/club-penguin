import type { VercelRequest, VercelResponse } from '@vercel/node'
import { dbError, sql } from './_lib/db'
import { requireUser } from './_lib/session'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * GET  /api/igloo?owner=<uuid> -> anyone's igloo, so friends can visit
 * POST /api/igloo              -> save your own {style, items}
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = requireUser(req, res)
  if (!userId) return

  try {
    if (req.method === 'GET') {
      const owner = String(req.query.owner ?? '')
      if (!UUID.test(owner)) {
        res.status(400).json({ error: 'No such igloo' })
        return
      }
      const rows = (await sql`
        select i.owner, i.style, i.items, p.username
          from igloos i join profiles p on p.id = i.owner
         where i.owner = ${owner}`) as unknown as Array<{
        owner: string
        style: string
        items: unknown
        username: string
      }>
      const row = rows[0]
      res.status(200).json({
        owner,
        ownerName: row?.username ?? 'Someone',
        style: row?.style ?? 'igloo_classic',
        items: row?.items ?? [],
      })
      return
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST')
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    // You can only ever save your own igloo: the owner comes from the session.
    const { style, items } = (req.body ?? {}) as { style?: string; items?: unknown[] }
    await sql`
      update igloos
         set style = ${style ?? 'igloo_classic'},
             items = ${JSON.stringify(Array.isArray(items) ? items : [])}::jsonb
       where owner = ${userId}`
    res.status(200).json({ ok: true })
  } catch (err) {
    const { status, message } = dbError(err)
    res.status(status).json({ error: message })
  }
}
