import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Equipped } from '../lib/types'

export interface IslandPresence {
  id: string
  username: string
  color: string
  equipped: Equipped
  room: string
  roomName: string
}

/**
 * One island-wide presence channel, separate from the per-room ones. It answers
 * "who is online and which room are they in", which powers the friends list and
 * the map's room counts.
 */
export function useIsland(
  me: { id: string; username: string; color: string; equipped: Equipped } | null,
  room: string,
  roomName: string,
) {
  const [online, setOnline] = useState<Record<string, IslandPresence>>({})
  const channelRef = useRef<RealtimeChannel | null>(null)
  const latest = useRef({ me, room, roomName })
  latest.current = { me, room, roomName }

  useEffect(() => {
    if (!me) return
    const myId = me.id
    const channel = supabase.channel('island', {
      config: { presence: { key: myId }, broadcast: { self: false } },
    })
    channelRef.current = channel

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<IslandPresence>()
      const next: Record<string, IslandPresence> = {}
      for (const [key, entries] of Object.entries(state)) {
        const p = entries[0]
        if (p?.username) next[key] = p
      }
      setOnline(next)
    })

    channel.subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') return
      const l = latest.current
      if (!l.me) return
      await channel.track({
        id: l.me.id,
        username: l.me.username,
        color: l.me.color,
        equipped: l.me.equipped,
        room: l.room,
        roomName: l.roomName,
      } satisfies IslandPresence)
    })

    return () => {
      channelRef.current = null
      void supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id])

  // Re-announce whenever we change room or outfit.
  useEffect(() => {
    if (!me || !channelRef.current) return
    void channelRef.current.track({
      id: me.id,
      username: me.username,
      color: me.color,
      equipped: me.equipped,
      room,
      roomName,
    } satisfies IslandPresence)
  }, [me, room, roomName])

  return { online, count: Object.keys(online).length }
}
