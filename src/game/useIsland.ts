import { useEffect, useState } from 'react'
import { islandOnline } from '../lib/api'
import type { Equipped } from '../lib/types'

/** Polled slowly: it only feeds the map's room counts and the online dots. */
const POLL_MS = 3000

export interface IslandPresence {
  id: string
  username: string
  color: string
  equipped: Equipped
  room: string
  roomName: string
}

/**
 * Who is online and which room they are in. Our own row is published by the
 * room sync (see useRoom), so this hook only reads.
 */
export function useIsland(me: { id: string } | null) {
  const [online, setOnline] = useState<Record<string, IslandPresence>>({})

  useEffect(() => {
    if (!me) return
    let cancelled = false

    const poll = async () => {
      try {
        const { online: rows } = await islandOnline()
        if (cancelled) return
        const next: Record<string, IslandPresence> = {}
        for (const row of rows) {
          if (row.username) next[row.id] = { ...row, equipped: row.equipped ?? {} }
        }
        setOnline(next)
      } catch {
        // A dropped poll is harmless: the next one is three seconds away.
      }
    }

    void poll()
    const timer = window.setInterval(() => void poll(), POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id])

  return { online, count: Object.keys(online).length }
}
