import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { roomSync, type OutgoingEvent, type RoomPlayer } from '../lib/api'
import type { Equipped, PlayerState, Snowball } from '../lib/types'
import { type Room, clampToWalk } from './rooms'
import { SNOWBALL_FLIGHT_MS, WALK_SPEED } from './render'

/** How often we publish our position and pick up everyone else's. */
const SYNC_MS = 500
/** Chat, emotes and snowballs go out sooner than that, but not faster than this. */
const NUDGE_MS = 150

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

function makePlayer(p: RoomPlayer): PlayerState {
  return {
    id: p.id,
    username: p.username,
    color: p.color,
    equipped: p.equipped ?? {},
    x: p.x,
    y: p.y,
    tx: p.tx ?? p.x,
    ty: p.ty ?? p.y,
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
 * Keeps one room in sync with the server: who is here, where they are walking,
 * and what they said. A single POST /api/room per tick both publishes our own
 * position and returns the roster plus every event since our cursor, so a busy
 * room is still one request per client per tick.
 *
 * Positions live in refs so the render loop never re-renders React.
 */
export function useRoom(roomId: string, me: Look | null, room: Room) {
  const players = useRef<Map<string, PlayerState>>(new Map())
  const snowballs = useRef<Snowball[]>([])
  const meRef = useRef<Look | null>(me)
  const snowballId = useRef(0)

  // Events waiting for the next tick, and the highest event id we have applied.
  const outbox = useRef<OutgoingEvent[]>([])
  const since = useRef(-1)
  const inFlight = useRef(false)
  const nudge = useRef(0)

  const [online, setOnline] = useState(0)
  const [chatLog, setChatLog] = useState<ChatLine[]>([])
  const [connected, setConnected] = useState(false)

  meRef.current = me

  // The room object is rebuilt whenever an igloo is edited, so read it through
  // a ref: the sync loop must not restart on every change.
  const roomRef = useRef(room)
  roomRef.current = room

  // Spawn only needs to be re-read when we actually change room.
  const spawn = useMemo(() => roomRef.current.spawn, [roomId])

  /** One round trip: publish us, apply the roster and the new events. */
  const sync = useCallback(async () => {
    const m = meRef.current
    if (!m || inFlight.current) return
    const self = players.current.get(m.id)
    if (!self) return

    const events = outbox.current
    outbox.current = []
    inFlight.current = true
    try {
      const result = await roomSync({
        roomId,
        roomName: roomRef.current.name,
        x: Math.round(self.x),
        y: Math.round(self.y),
        tx: Math.round(self.tx),
        ty: Math.round(self.ty),
        dir: self.dir,
        since: since.current,
        events,
      })
      since.current = result.lastId

      // Roster: identity and looks come from here, and so do the positions of
      // penguins we have not met yet.
      const seen = new Set<string>([m.id])
      for (const p of result.players) {
        if (p.id === m.id) continue
        seen.add(p.id)
        const known = players.current.get(p.id)
        if (known) {
          known.username = p.username
          known.color = p.color
          known.equipped = p.equipped ?? {}
          // Trust the roster for the walk target too: it is written by the same
          // poll that carries move events, so it never lags behind them.
          known.tx = p.tx
          known.ty = p.ty
          known.dir = p.dir
        } else {
          players.current.set(p.id, makePlayer(p))
        }
      }
      for (const key of [...players.current.keys()]) {
        if (!seen.has(key)) players.current.delete(key)
      }
      setOnline(players.current.size)

      const now = performance.now()
      for (const event of result.events) {
        const p = players.current.get(event.from)
        const payload = event.payload
        if (event.kind === 'move') {
          if (!p) continue
          p.tx = Number(payload.tx)
          p.ty = Number(payload.ty)
          p.dir = payload.dir === -1 ? -1 : 1
        } else if (event.kind === 'chat') {
          const text = String(payload.text ?? '')
          if (!text) continue
          if (p) {
            p.bubble = text
            p.bubbleAt = now
          }
          setChatLog((log) =>
            [...log, { id: event.from, name: payload.name, text, at: Date.now() }].slice(-60),
          )
        } else if (event.kind === 'emote') {
          if (!p) continue
          p.emote = String(payload.emote ?? '')
          p.emoteAt = now
        } else if (event.kind === 'snowball') {
          snowballs.current.push({
            id: ++snowballId.current,
            fromX: Number(payload.fromX),
            fromY: Number(payload.fromY),
            toX: Number(payload.toX),
            toY: Number(payload.toY),
            start: now,
          })
        }
      }
      setConnected(true)
    } catch {
      // Put the events back so a dropped poll does not eat a chat message.
      outbox.current = [...events, ...outbox.current]
      setConnected(false)
    } finally {
      inFlight.current = false
    }
  }, [roomId])

  /** Send soon rather than on the next tick, for chat and other one-offs. */
  const send = useCallback(
    (event: OutgoingEvent) => {
      outbox.current.push(event)
      const now = performance.now()
      if (now - nudge.current < NUDGE_MS) return
      nudge.current = now
      void sync()
    },
    [sync],
  )

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
      tx: spawn.x,
      ty: spawn.y,
      dir: existing?.dir ?? 1,
    })
    players.current = new Map([[myId, self]])
    snowballs.current = []
    outbox.current = []
    since.current = -1
    setChatLog([])
    setConnected(false)

    void sync()
    const timer = window.setInterval(() => void sync(), SYNC_MS)
    return () => {
      window.clearInterval(timer)
      setConnected(false)
    }
    // `me` identity changes (new clothes) reach everyone through the roster.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, me?.id, sync])

  // Keep our own penguin's looks current; the roster carries them to everyone
  // else on the next tick.
  useEffect(() => {
    if (!me) return
    const s = players.current.get(me.id)
    if (!s) return
    s.color = me.color
    s.equipped = me.equipped
    s.username = me.username
  }, [me])

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
      send({
        kind: 'move',
        payload: { tx: Math.round(target.x), ty: Math.round(target.y), dir: self.dir },
      })
    },
    [send],
  )

  const say = useCallback(
    (text: string) => {
      const m = meRef.current
      if (!m) return
      const clean = text.trim().slice(0, 120)
      if (!clean) return
      const self = players.current.get(m.id)
      if (self) {
        self.bubble = clean
        self.bubbleAt = performance.now()
      }
      setChatLog((log) =>
        [...log, { id: m.id, name: m.username, text: clean, at: Date.now() }].slice(-60),
      )
      send({ kind: 'chat', payload: { text: clean } })
    },
    [send],
  )

  const doEmote = useCallback(
    (emote: string) => {
      const m = meRef.current
      if (!m) return
      const self = players.current.get(m.id)
      if (self) {
        self.emote = emote
        self.emoteAt = performance.now()
      }
      send({ kind: 'emote', payload: { emote } })
    },
    [send],
  )

  const throwSnowball = useCallback(
    (toX: number, toY: number) => {
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
      send({ kind: 'snowball', payload })
    },
    [send],
  )

  return { players, snowballs, step, moveTo, say, doEmote, throwSnowball, online, chatLog, connected }
}
