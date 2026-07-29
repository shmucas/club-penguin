import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Equipped, PlayerState, Snowball } from '../lib/types'
import { type Room, clampToWalk } from './rooms'
import { SNOWBALL_FLIGHT_MS, WALK_SPEED } from './render'

export interface ChatLine {
  id: string
  name: string
  text: string
  at: number
}

interface Look {
  id: string
  username: string
  color: string
  equipped: Equipped
}

/** Presence payload — just enough for a newcomer to draw everyone correctly. */
interface Presence extends Look {
  x: number
  y: number
  dir: 1 | -1
}

function makePlayer(p: Presence): PlayerState {
  return {
    id: p.id,
    username: p.username,
    color: p.color,
    equipped: p.equipped ?? {},
    x: p.x,
    y: p.y,
    tx: p.x,
    ty: p.y,
    dir: p.dir ?? 1,
    emote: null,
    emoteAt: 0,
    bubble: null,
    bubbleAt: 0,
    puffleX: p.x - 34,
    puffleY: p.y + 8,
    puffleHop: 0,
  }
}

/**
 * Joins one room's realtime channel: presence for who's here, broadcast for
 * movement, chat, emotes and snowballs. Positions live in refs so the render
 * loop never re-renders React.
 */
export function useRoom(roomId: string, me: Look | null, room: Room) {
  const players = useRef<Map<string, PlayerState>>(new Map())
  const snowballs = useRef<Snowball[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const meRef = useRef<Look | null>(me)
  const snowballId = useRef(0)

  const [online, setOnline] = useState(0)
  const [chatLog, setChatLog] = useState<ChatLine[]>([])
  const [connected, setConnected] = useState(false)

  meRef.current = me

  // The room object is rebuilt whenever an igloo is edited, so read it through
  // a ref: the channel subscription must not tear down on every change.
  const roomRef = useRef(room)
  roomRef.current = room

  // Spawn only needs to be re-read when we actually change room.
  const spawn = useMemo(() => roomRef.current.spawn, [roomId])

  useEffect(() => {
    if (!me) return
    const myId = me.id

    // Start (or move) our own penguin at the room's spawn point.
    const existing = players.current.get(myId)
    const self: PlayerState = makePlayer({
      id: myId,
      username: me.username,
      color: me.color,
      equipped: me.equipped,
      x: spawn.x,
      y: spawn.y,
      dir: existing?.dir ?? 1,
    })
    players.current = new Map([[myId, self]])
    snowballs.current = []
    setChatLog([])

    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: myId }, broadcast: { self: false } },
    })
    channelRef.current = channel

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<Presence>()
      const seen = new Set<string>()
      for (const [key, entries] of Object.entries(state)) {
        const p = entries[0]
        if (!p || !p.username) continue
        seen.add(key)
        if (key === myId) continue
        const known = players.current.get(key)
        if (known) {
          // Trust presence for identity/looks, not for position — broadcasts
          // are more current than the last keepalive.
          known.username = p.username
          known.color = p.color
          known.equipped = p.equipped ?? {}
        } else {
          players.current.set(key, makePlayer(p))
        }
      }
      for (const key of [...players.current.keys()]) {
        if (!seen.has(key) && key !== myId) players.current.delete(key)
      }
      setOnline(players.current.size)
    })

    channel.on('broadcast', { event: 'move' }, ({ payload }) => {
      const p = players.current.get(payload.id)
      if (!p) return
      p.tx = payload.tx
      p.ty = payload.ty
      p.dir = payload.dir
    })

    channel.on('broadcast', { event: 'chat' }, ({ payload }) => {
      const p = players.current.get(payload.id)
      const now = performance.now()
      if (p) {
        p.bubble = payload.text
        p.bubbleAt = now
      }
      setChatLog((log) =>
        [...log, { id: payload.id, name: payload.name, text: payload.text, at: Date.now() }].slice(-60),
      )
    })

    channel.on('broadcast', { event: 'emote' }, ({ payload }) => {
      const p = players.current.get(payload.id)
      if (!p) return
      p.emote = payload.emote
      p.emoteAt = performance.now()
    })

    channel.on('broadcast', { event: 'snowball' }, ({ payload }) => {
      snowballs.current.push({
        id: ++snowballId.current,
        fromX: payload.fromX,
        fromY: payload.fromY,
        toX: payload.toX,
        toY: payload.toY,
        start: performance.now(),
      })
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setConnected(true)
        const s = players.current.get(myId)
        await channel.track({
          id: myId,
          username: me.username,
          color: me.color,
          equipped: me.equipped,
          x: s?.x ?? spawn.x,
          y: s?.y ?? spawn.y,
          dir: s?.dir ?? 1,
        } satisfies Presence)
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        setConnected(false)
      }
    })

    // Keepalive: refresh our presence position so people who join later see us
    // in roughly the right place.
    const keepalive = window.setInterval(() => {
      const s = players.current.get(myId)
      const m = meRef.current
      if (!s || !m) return
      void channel.track({
        id: myId,
        username: m.username,
        color: m.color,
        equipped: m.equipped,
        x: Math.round(s.x),
        y: Math.round(s.y),
        dir: s.dir,
      } satisfies Presence)
    }, 4000)

    return () => {
      window.clearInterval(keepalive)
      setConnected(false)
      channelRef.current = null
      void supabase.removeChannel(channel)
    }
    // `me` identity changes (new clothes) are pushed via the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, me?.id])

  // Push wardrobe changes to everyone without rejoining the channel.
  useEffect(() => {
    if (!me || !channelRef.current) return
    const s = players.current.get(me.id)
    if (s) {
      s.color = me.color
      s.equipped = me.equipped
      s.username = me.username
    }
    void channelRef.current.track({
      id: me.id,
      username: me.username,
      color: me.color,
      equipped: me.equipped,
      x: Math.round(s?.x ?? spawn.x),
      y: Math.round(s?.y ?? spawn.y),
      dir: s?.dir ?? 1,
    } satisfies Presence)
  }, [me, spawn.x, spawn.y])

  /** Advance every penguin and its puffle. Called once per animation frame. */
  const step = useCallback((dt: number) => {
    const now = performance.now()
    const t = now / 1000

    for (const p of players.current.values()) {
      const dx = p.tx - p.x
      const dy = p.ty - p.y
      const dist = Math.hypot(dx, dy)
      if (dist < 1) {
        p.x = p.tx
        p.y = p.ty
      } else {
        const move = Math.min(dist, WALK_SPEED * dt)
        p.x += (dx / dist) * move
        p.y += (dy / dist) * move
      }

      // The puffle trails a little behind and to one side of its owner.
      if (p.equipped.puffle) {
        const goalX = p.x - p.dir * 36
        const goalY = p.y + 9
        const pdx = goalX - p.puffleX
        const pdy = goalY - p.puffleY
        const pdist = Math.hypot(pdx, pdy)
        if (pdist > 5) {
          // Slightly faster than a penguin, so it can catch up after a long walk.
          const move = Math.min(pdist, WALK_SPEED * 1.25 * dt)
          p.puffleX += (pdx / pdist) * move
          p.puffleY += (pdy / pdist) * move
          p.puffleHop = Math.abs(Math.sin(t * 9))
        } else {
          // Idle: a slow, contented bob.
          p.puffleHop = Math.max(0, Math.sin(t * 1.6)) * 0.22
        }
      }
    }

    snowballs.current = snowballs.current.filter((s) => now - s.start < SNOWBALL_FLIGHT_MS + 400)
  }, [])

  const moveTo = useCallback(
    (x: number, y: number) => {
      const m = meRef.current
      if (!m) return
      const self = players.current.get(m.id)
      if (!self) return
      const target = clampToWalk(roomRef.current, x, y)
      self.tx = target.x
      self.ty = target.y
      if (Math.abs(target.x - self.x) > 4) self.dir = target.x > self.x ? 1 : -1
      void channelRef.current?.send({
        type: 'broadcast',
        event: 'move',
        payload: { id: m.id, tx: Math.round(target.x), ty: Math.round(target.y), dir: self.dir },
      })
    },
    [roomId],
  )

  const say = useCallback((text: string) => {
    const m = meRef.current
    if (!m) return
    const clean = text.trim().slice(0, 120)
    if (!clean) return
    const self = players.current.get(m.id)
    if (self) {
      self.bubble = clean
      self.bubbleAt = performance.now()
    }
    setChatLog((log) => [...log, { id: m.id, name: m.username, text: clean, at: Date.now() }].slice(-60))
    void channelRef.current?.send({
      type: 'broadcast',
      event: 'chat',
      payload: { id: m.id, name: m.username, text: clean },
    })
  }, [])

  const doEmote = useCallback((emote: string) => {
    const m = meRef.current
    if (!m) return
    const self = players.current.get(m.id)
    if (self) {
      self.emote = emote
      self.emoteAt = performance.now()
    }
    void channelRef.current?.send({
      type: 'broadcast',
      event: 'emote',
      payload: { id: m.id, emote },
    })
  }, [])

  const throwSnowball = useCallback((toX: number, toY: number) => {
    const m = meRef.current
    if (!m) return
    const self = players.current.get(m.id)
    if (!self) return
    if (Math.abs(toX - self.x) > 6) self.dir = toX > self.x ? 1 : -1
    const payload = {
      fromX: Math.round(self.x),
      fromY: Math.round(self.y),
      toX: Math.round(toX),
      toY: Math.round(toY),
    }
    snowballs.current.push({ id: ++snowballId.current, ...payload, start: performance.now() })
    void channelRef.current?.send({ type: 'broadcast', event: 'snowball', payload })
  }, [])

  return { players, snowballs, step, moveTo, say, doEmote, throwSnowball, online, chatLog, connected }
}
