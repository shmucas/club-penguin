import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { Equipped, GameId, Profile, Slot } from '../lib/types'
import { ROOMS, type RoomId, drawHotspot } from '../game/rooms'
import {
  WORLD_H,
  WORLD_W,
  drawBubble,
  drawPenguin,
  drawSnowball,
  drawSplat,
} from '../game/render'
import { useRoom } from '../game/useRoom'
import { Shop } from './Shop'
import { SledRush } from './games/SledRush'
import { IceFishing } from './games/IceFishing'
import { CoffeeRush } from './games/CoffeeRush'

interface Props {
  profile: Profile
  inventory: Set<string>
  onBuy: (itemId: string) => Promise<void>
  onEquip: (slot: Slot | 'color', itemId: string | null) => Promise<void>
  onAward: (game: GameId, score: number) => Promise<number>
  onSignOut: () => void
}

type Overlay = { kind: 'shop' } | { kind: 'game'; game: GameId } | null

const QUICK_CHAT = ['Hi!', 'Wanna play?', 'Nice hat!', 'Follow me!', 'Bye!']

export function World({ profile, inventory, onBuy, onEquip, onAward, onSignOut }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [roomId, setRoomId] = useState<RoomId>('town')
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [text, setText] = useState('')
  const [snowballMode, setSnowballMode] = useState(false)
  const [hovered, setHovered] = useState<number>(-1)

  const room = ROOMS[roomId]

  const me = useMemo(
    () => ({
      id: profile.id,
      username: profile.username,
      color: profile.color,
      equipped: profile.equipped,
    }),
    [profile.id, profile.username, profile.color, profile.equipped],
  )

  const { players, snowballs, step, moveTo, say, doEmote, throwSnowball, online, chatLog, connected } =
    useRoom(roomId, me)

  const snowballRef = useRef(snowballMode)
  snowballRef.current = snowballMode
  const overlayRef = useRef(overlay)
  overlayRef.current = overlay

  // --- render loop ---------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(WORLD_W * dpr)
      canvas.height = Math.round(WORLD_H * dpr)
    }
    fit()
    window.addEventListener('resize', fit)

    let raf = 0
    let last = performance.now()

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      step(dt)

      const scale = canvas.width / WORLD_W
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      const t = now / 1000

      room.paint(ctx, t)

      if (hovered >= 0 && room.hotspots[hovered]) {
        drawHotspot(ctx, room.hotspots[hovered], t)
      }

      const cast = [...players.current.values()].sort((a, b) => a.y - b.y)
      for (const p of cast) {
        drawPenguin(ctx, p, now, { self: p.id === profile.id })
      }
      for (const s of snowballs.current) {
        drawSnowball(ctx, s, now)
        drawSplat(ctx, s, now)
      }
      for (const p of cast) {
        drawBubble(ctx, p, now)
      }

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', fit)
    }
  }, [room, hovered, step, players, snowballs, profile.id])

  // --- pointer -------------------------------------------------------------
  const toWorld = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current!
    const r = canvas.getBoundingClientRect()
    return {
      x: ((clientX - r.left) / r.width) * WORLD_W,
      y: ((clientY - r.top) / r.height) * WORLD_H,
    }
  }, [])

  const hotspotAt = useCallback(
    (x: number, y: number) =>
      room.hotspots.findIndex((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h),
    [room],
  )

  const onPointerMove = (e: React.PointerEvent) => {
    const { x, y } = toWorld(e.clientX, e.clientY)
    const idx = hotspotAt(x, y)
    if (idx !== hovered) setHovered(idx)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (overlayRef.current) return
    const { x, y } = toWorld(e.clientX, e.clientY)
    const idx = hotspotAt(x, y)
    if (idx >= 0) {
      const action = room.hotspots[idx].action
      setHovered(-1)
      if (action.type === 'room') setRoomId(action.room)
      else if (action.type === 'shop') setOverlay({ kind: 'shop' })
      else setOverlay({ kind: 'game', game: action.game })
      return
    }
    if (snowballRef.current) {
      throwSnowball(x, y)
      setSnowballMode(false)
      return
    }
    moveTo(x, y)
  }

  // --- keyboard shortcuts --------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = document.activeElement?.tagName === 'INPUT'
      if (e.key === 'Enter' && !typing) {
        e.preventDefault()
        inputRef.current?.focus()
        return
      }
      if (e.key === 'Escape') {
        setSnowballMode(false)
        ;(document.activeElement as HTMLElement | null)?.blur()
        return
      }
      if (typing || overlayRef.current) return
      if (e.key === 'd' || e.key === 'D') doEmote('dance')
      if (e.key === 'w' || e.key === 'W') doEmote('wave')
      if (e.key === 's' || e.key === 'S') doEmote('sit')
      if (e.key === 't' || e.key === 'T') setSnowballMode((v) => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doEmote])

  const submitChat = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    say(text)
    setText('')
  }

  const look = { color: profile.color, equipped: profile.equipped as Equipped }
  const award = useCallback(
    async (game: GameId, score: number) => {
      return onAward(game, score)
    },
    [onAward],
  )

  return (
    <div className="world">
      <header className="hud">
        <div className="hud-left">
          <span className="room-name">{room.name}</span>
          <span className={connected ? 'dot online' : 'dot offline'} title={connected ? 'Connected' : 'Reconnecting…'} />
          <span className="muted small">{online} here</span>
        </div>
        <div className="hud-right">
          <span className="coins" title="Coins">
            <span className="coin-icon">◎</span> {profile.coins.toLocaleString()}
          </span>
          <button className="btn ghost" onClick={() => setOverlay({ kind: 'shop' })}>
            Wardrobe
          </button>
          <button className="btn ghost" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </header>

      <div className="stage-wrap">
        <canvas
          ref={canvasRef}
          className={`stage${hovered >= 0 ? ' pointing' : ''}${snowballMode ? ' aiming' : ''}`}
          onPointerMove={onPointerMove}
          onPointerDown={onPointerDown}
          onPointerLeave={() => setHovered(-1)}
        />

        <aside className="chat-log">
          <h3>Chat</h3>
          <ul>
            {chatLog.length === 0 && <li className="muted">Say hello — everyone in the room will see it.</li>}
            {chatLog.map((line, i) => (
              <li key={`${line.at}-${i}`}>
                <strong className={line.id === profile.id ? 'me' : ''}>{line.name}</strong> {line.text}
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <footer className="chat-bar">
        <form onSubmit={submitChat}>
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Press Enter to chat…"
            maxLength={120}
          />
          <button className="btn primary" type="submit">
            Say
          </button>
        </form>

        <div className="quick-chat">
          {QUICK_CHAT.map((q) => (
            <button key={q} className="chip" onClick={() => say(q)}>
              {q}
            </button>
          ))}
        </div>

        <div className="actions">
          <button className="chip" onClick={() => doEmote('wave')} title="W">
            👋 Wave
          </button>
          <button className="chip" onClick={() => doEmote('dance')} title="D">
            🕺 Dance
          </button>
          <button className="chip" onClick={() => doEmote('sit')} title="S">
            🪑 Sit
          </button>
          <button
            className={snowballMode ? 'chip active' : 'chip'}
            onClick={() => setSnowballMode((v) => !v)}
            title="T"
          >
            ❄️ {snowballMode ? 'Click to throw' : 'Snowball'}
          </button>
        </div>
      </footer>

      {overlay?.kind === 'shop' && (
        <Shop
          profile={profile}
          inventory={inventory}
          onBuy={onBuy}
          onEquip={onEquip}
          onClose={() => setOverlay(null)}
        />
      )}
      {overlay?.kind === 'game' && overlay.game === 'sled' && (
        <SledRush look={look} onAward={(s) => award('sled', s)} onExit={() => setOverlay(null)} />
      )}
      {overlay?.kind === 'game' && overlay.game === 'fishing' && (
        <IceFishing look={look} onAward={(s) => award('fishing', s)} onExit={() => setOverlay(null)} />
      )}
      {overlay?.kind === 'game' && overlay.game === 'coffee' && (
        <CoffeeRush look={look} onAward={(s) => award('coffee', s)} onExit={() => setOverlay(null)} />
      )}
    </div>
  )
}
