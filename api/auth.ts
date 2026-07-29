import type { VercelRequest, VercelResponse } from '@vercel/node'
import { dbError, sql } from './_lib/db'
import {
  clearSessionCookie,
  getUserId,
  hashPassword,
  setSessionCookie,
  verifyPassword,
} from './_lib/session'

interface ProfileRow {
  id: string
  username: string
  color: string
  coins: number
  equipped: Record<string, string>
  puffle_names: Record<string, string>
}

/** The signed-in player: their penguin (if they made one) and what they own. */
async function loadMe(userId: string) {
  const [profiles, inventory] = await Promise.all([
    sql`select id, username, color, coins, equipped, puffle_names
          from profiles where id = ${userId}` as unknown as Promise<ProfileRow[]>,
    sql`select item_id from inventory where profile_id = ${userId}` as unknown as Promise<
      Array<{ item_id: string }>
    >,
  ])
  const p = profiles[0]
  return {
    userId,
    profile: p
      ? {
          id: p.id,
          username: p.username,
          color: p.color,
          coins: p.coins,
          equipped: p.equipped ?? {},
          puffleNames: p.puffle_names ?? {},
        }
      : null,
    inventory: inventory.map((r) => r.item_id),
  }
}

/**
 * GET  /api/auth  -> the current session, or {userId: null}
 * POST /api/auth  -> {action: 'signup' | 'login' | 'logout'}
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const userId = getUserId(req)
      if (!userId) {
        res.status(200).json({ userId: null, profile: null, inventory: [] })
        return
      }
      res.status(200).json(await loadMe(userId))
      return
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST')
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    const { action, email, password } = (req.body ?? {}) as Record<string, string>

    if (action === 'logout') {
      clearSessionCookie(res)
      res.status(200).json({ ok: true })
      return
    }

    const cleanEmail = (email ?? '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      res.status(400).json({ error: 'That does not look like an email address.' })
      return
    }
    if (!password || password.length < 6) {
      res.status(400).json({ error: 'Passwords need at least 6 characters.' })
      return
    }

    if (action === 'signup') {
      const taken = (await sql`select 1 from users where lower(email) = ${cleanEmail}`) as unknown as unknown[]
      if (taken.length > 0) {
        res.status(409).json({ error: 'That email already has an account. Try logging in.' })
        return
      }
      const rows = (await sql`
        insert into users (email, password_hash)
        values (${cleanEmail}, ${await hashPassword(password)})
        returning id`) as unknown as Array<{ id: string }>
      setSessionCookie(res, rows[0].id)
      res.status(200).json(await loadMe(rows[0].id))
      return
    }

    if (action === 'login') {
      const rows = (await sql`
        select id, password_hash from users where lower(email) = ${cleanEmail}`) as unknown as Array<{
        id: string
        password_hash: string
      }>
      const user = rows[0]
      if (!user || !(await verifyPassword(password, user.password_hash))) {
        res.status(401).json({ error: 'Wrong email or password.' })
        return
      }
      setSessionCookie(res, user.id)
      res.status(200).json(await loadMe(user.id))
      return
    }

    res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    const { status, message } = dbError(err)
    res.status(status).json({ error: message })
  }
}
