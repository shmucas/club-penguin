import type { VercelRequest, VercelResponse } from '@vercel/node'
import { dbError, sql } from './_lib/db.js'
import { requireUser } from './_lib/session.js'

interface Row {
  id: string
  username: string
  color: string
  equipped: Record<string, string>
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * GET  /api/friends -> {friends, requests}
 * POST /api/friends -> {action: 'request' | 'accept' | 'decline' | 'remove', id}
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = requireUser(req, res)
  if (!userId) return

  try {
    if (req.method === 'GET') {
      const [friends, requests] = await Promise.all([
        sql`select * from my_friends(${userId}::uuid)` as unknown as Promise<Row[]>,
        sql`select * from my_friend_requests(${userId}::uuid)` as unknown as Promise<Row[]>,
      ])
      const shape = (rows: Row[]) => rows.map((r) => ({ ...r, equipped: r.equipped ?? {} }))
      res.status(200).json({ friends: shape(friends), requests: shape(requests) })
      return
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST')
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    const { action, id } = (req.body ?? {}) as { action?: string; id?: string }
    if (!id || !UUID.test(id)) {
      res.status(400).json({ error: 'No such penguin' })
      return
    }

    if (action === 'request') {
      const rows = (await sql`
        select send_friend_request(${userId}::uuid, ${id}::uuid) as result`) as unknown as Array<{
        result: string
      }>
      res.status(200).json({ result: rows[0].result })
      return
    }
    if (action === 'accept') {
      await sql`select accept_friend_request(${userId}::uuid, ${id}::uuid)`
    } else if (action === 'decline') {
      await sql`select decline_friend_request(${userId}::uuid, ${id}::uuid)`
    } else if (action === 'remove') {
      await sql`select remove_friend(${userId}::uuid, ${id}::uuid)`
    } else {
      res.status(400).json({ error: 'Unknown action' })
      return
    }
    res.status(200).json({ ok: true })
  } catch (err) {
    const { status, message } = dbError(err)
    res.status(status).json({ error: message })
  }
}
