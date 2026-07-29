import type { VercelRequest, VercelResponse } from '@vercel/node'
import { dbError, sql } from './_lib/db'
import { requireUser } from './_lib/session'

/**
 * POST  /api/penguin  -> create the penguin {username, color}
 * PATCH /api/penguin  -> change looks {color?, equipped?, puffleNames?}
 *
 * Deliberately not a passthrough update: coins and last_award are never
 * writable from here, whatever the body contains.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = requireUser(req, res)
  if (!userId) return

  try {
    if (req.method === 'POST') {
      const { username, color } = (req.body ?? {}) as { username?: string; color?: string }
      await sql`select create_penguin(${userId}::uuid, ${username ?? ''}, ${color ?? 'color_blue'})`
      res.status(200).json({ ok: true })
      return
    }

    if (req.method === 'PATCH') {
      const body = (req.body ?? {}) as {
        color?: string
        equipped?: Record<string, string>
        puffleNames?: Record<string, string>
      }

      if (body.color !== undefined) {
        await sql`update profiles set color = ${body.color} where id = ${userId}`
      }
      if (body.equipped !== undefined) {
        await sql`update profiles set equipped = ${JSON.stringify(body.equipped)}::jsonb
                   where id = ${userId}`
      }
      if (body.puffleNames !== undefined) {
        // Nicknames are free text, so cap them the same way the UI does.
        const names: Record<string, string> = {}
        for (const [k, v] of Object.entries(body.puffleNames)) {
          names[k] = String(v).trim().slice(0, 16)
        }
        await sql`update profiles set puffle_names = ${JSON.stringify(names)}::jsonb
                   where id = ${userId}`
      }
      res.status(200).json({ ok: true })
      return
    }

    res.setHeader('Allow', 'POST, PATCH')
    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    const { status, message } = dbError(err)
    res.status(status).json({ error: message })
  }
}
