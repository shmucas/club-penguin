import type { VercelRequest, VercelResponse } from '@vercel/node'
import { dbError, sql } from './_lib/db.js'
import { requireMethod, requireUser } from './_lib/session.js'

/**
 * POST /api/coins
 *   {action: 'buy', item}          -> spend coins, gain the item
 *   {action: 'award', game, score} -> earn coins for a minigame round
 *
 * Both go through the Postgres functions, which own the per-game ceiling, the
 * payout cooldown and the "can you afford it" check.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, 'POST')) return
  const userId = requireUser(req, res)
  if (!userId) return

  const { action, item, game, score } = (req.body ?? {}) as {
    action?: string
    item?: string
    game?: string
    score?: number
  }

  try {
    if (action === 'buy') {
      const rows = (await sql`select buy_item(${userId}::uuid, ${item ?? ''}) as coins`) as unknown as Array<{
        coins: number
      }>
      res.status(200).json({ coins: rows[0].coins })
      return
    }

    if (action === 'award') {
      const rows = (await sql`
        select award_coins(${userId}::uuid, ${game ?? ''}, ${Math.floor(Number(score) || 0)}) as coins
      `) as unknown as Array<{ coins: number }>
      res.status(200).json({ coins: rows[0].coins })
      return
    }

    res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    const { status, message } = dbError(err)
    res.status(status).json({ error: message })
  }
}
