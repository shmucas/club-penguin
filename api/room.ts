import type { VercelRequest, VercelResponse } from '@vercel/node'
import { dbError, sql } from './_lib/db.js'
import { requireUser } from './_lib/session.js'

const num = (v: unknown, fallback = 0) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.max(-10000, Math.min(10000, n)) : fallback
}

/**
 * GET  /api/room -> who is on the island and where (map counts, online dots)
 * POST /api/room -> one poll: publish my position and outgoing events, get the
 *                   room's roster and everything said since my cursor.
 *
 * This replaces the realtime channels: the client calls POST about twice a
 * second while it is in a room. Chat text is trimmed here as well as in the UI.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = requireUser(req, res)
  if (!userId) return

  try {
    if (req.method === 'GET') {
      const rows = (await sql`select island_online() as online`) as unknown as Array<{ online: unknown[] }>
      res.status(200).json({ online: rows[0]?.online ?? [] })
      return
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST')
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    const body = (req.body ?? {}) as {
      roomId?: string
      roomName?: string
      x?: number
      y?: number
      tx?: number
      ty?: number
      dir?: number
      since?: number
      events?: Array<{ kind?: string; payload?: Record<string, unknown> }>
    }

    const roomId = String(body.roomId ?? '').slice(0, 64)
    if (!roomId) {
      res.status(400).json({ error: 'Which room?' })
      return
    }

    const events = (Array.isArray(body.events) ? body.events : []).slice(0, 20).map((e) => {
      const payload = { ...(e.payload ?? {}) }
      if (typeof payload.text === 'string') payload.text = payload.text.slice(0, 120)
      return { kind: e.kind, payload }
    })

    const rows = (await sql`
      select room_sync(
        ${userId}::uuid,
        ${roomId},
        ${String(body.roomName ?? roomId).slice(0, 64)},
        ${num(body.x)}, ${num(body.y)}, ${num(body.tx)}, ${num(body.ty)},
        ${body.dir === -1 ? -1 : 1},
        ${Math.trunc(Number(body.since) || 0)},
        ${JSON.stringify(events)}::jsonb
      ) as result`) as unknown as Array<{ result: unknown }>

    res.status(200).json(rows[0].result)
  } catch (err) {
    const { status, message } = dbError(err)
    res.status(status).json({ error: message })
  }
}
