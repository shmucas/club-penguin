import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { getIgloo, saveIgloo as saveIglooApi } from '../lib/api'
import type {
  Equipped,
  FriendSummary,
  GameId,
  IglooData,
  PlayerState,
  Profile,
  Slot,
} from '../lib/types'
import {
  ROOMS,
  type RoomId,
  buildIglooRoom,
  drawHotspot,
  iglooRoomId,
  isIglooRoom,
  loadingIglooRoom,
} from '../game/rooms'
import {
  FURNITURE_BY_ID,
  type PlacedItem,
  drawFurnitureHighlight,
  hitsFurniture,
} from '../game/furniture'
import {
  WORLD_H,
  WORLD_W,
  drawBubble,
  drawPenguin,
  drawPlayerPuffle,
  drawSnowball,
  drawSplat,
} from '../game/render'
import { useRoom } from '../game/useRoom'
import { useIsland } from '../game/useIsland'
import { Shop } from './Shop'
import { PlayerCard, type CardTarget } from './PlayerCard'
import { FriendsPanel } from './FriendsPanel'
import { MapPanel } from './MapPanel'
import { IglooEditor } from './IglooEditor'
import { SledRush } from './games/SledRush'
import { IceFishing } from './games/IceFishing'
import { CoffeeRush } from './games/CoffeeRush'

interface Props {
  profile: Profile
  inventory: Set<string>
  friends: FriendSummary[]
  requests: FriendSummary[]
  onBuy: (itemId: string) => Promise<void>
  onEquip: (slot: Slot | 'color', itemId: string | null) => Promise<void>
  onAward: (game: GameId, score: number) => Promise<number>
  onRenamePuffle: (puffleId: string, name: string) => Promise<void>
  onAddFriend: (id: string) => Promise<void>
  onAcceptFriend: (id: string) => Promise<void>
  onDeclineFriend: (id: string) => Promise<void>
  onRemoveFriend: (id: string) => Promise<void>
  onSignOut: () => void
}

type Overlay =
  | { kind: 'shop'; tab?: Slot | 'color' | 'furniture' | 'igloo' }
  | { kind: 'game'; game: GameId }
  | { kind: 'friends' }
  | { kind: 'map' }
  | { kind: 'card'; target: CardTarget }
  | null

const QUICK_CHAT = ['Hi!', 'Wanna play?', 'Nice hat!', 'Follow me!', 'Bye!']

/** Roughly the box a penguin occupies, for click-to-open-card. */
function hitsPenguin(p: PlayerState, x: number, y: number) {
  return x >= p.x - 26 && x <= p.x + 26 && y >= p.y - 72 && y <= p.y + 8
}

export function World({
  profile,
  inventory,
  friends,
  requests,
  onBuy,
  onEquip,
  onAward,
  onRenamePuffle,
  onAddFriend,
  onAcceptFriend,
  onDeclineFriend,
  onRemoveFriend,
  onSignOut,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [roomId, setRoomId] = useState<string>('town')
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [text, setText] = useState('')
  const [snowballMode, setSnowballMode] = useState(false)
  const [hovered, setHovered] = useState(-1)
  const [friendBusy, setFriendBusy] = useState(false)
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set())

  // --- igloo state ---------------------------------------------------------
  const [iglooData, setIglooData] = useState<IglooData | null>(null)
  const [decorating, setDecorating] = useState(false)
  const [draft, setDraft] = useState<PlacedItem[]>([])
  const [draftStyle, setDraftStyle] = useState('igloo_classic')
  const [held, setHeld] = useState<string | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [iglooError, setIglooError] = useState<string | null>(null)
  const dragging = useRef(false)

  useEffect(() => {
    if (!isIglooRoom(roomId)) {
      setIglooData(null)
      setDecorating(false)
      return
    }
    const owner = roomId.slice('igloo:'.length)
    let cancelled = false
    void (async () => {
      const ig = await getIgloo(owner)
      if (cancelled) return
      setIglooData({
        ...ig,
        items: (ig.items as PlacedItem[]).filter((i) => FURNITURE_BY_ID[i.item]),
      })
    })()
    return () => {
      cancelled = true
    }
  }, [roomId])

  const room = useMemo(() => {
    if (isIglooRoom(roomId)) {
      if (!iglooData) return loadingIglooRoom('Igloo')
      return buildIglooRoom(
        decorating ? { ...iglooData, items: draft, style: draftStyle } : iglooData,
      )
    }
    return ROOMS[roomId as RoomId] ?? ROOMS.town
  }, [roomId, iglooData, decorating, draft, draftStyle])

  const isMyIgloo = room.iglooOwner === profile.id

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
    useRoom(roomId, me, room)
  const island = useIsland(me)

  const snowballRef = useRef(snowballMode)
  snowballRef.current = snowballMode
  const overlayRef = useRef(overlay)
  overlayRef.current = overlay
  const decoratingRef = useRef(decorating)
  decoratingRef.current = decorating
  const heldRef = useRef(held)
  heldRef.current = held
  const draftRef = useRef(draft)
  draftRef.current = draft
  const selectedRef = useRef(selected)
  selectedRef.current = selected
  const roomRef = useRef(room)
  roomRef.current = room

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

      const r = roomRef.current
      const scale = canvas.width / WORLD_W
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      const t = now / 1000

      r.paint(ctx, t)

      // Rugs lie flat under everything.
      const props = r.props ?? []
      for (const p of props) {
        const f = FURNITURE_BY_ID[p.item]
        if (!f?.flat) continue
        ctx.save()
        ctx.translate(p.x, p.y)
        f.draw(ctx, t)
        ctx.restore()
      }

      if (hovered >= 0 && r.hotspots[hovered]) {
        drawHotspot(ctx, r.hotspots[hovered], t)
      }

      // Penguins, their puffles and standing furniture share one depth sort.
      type Drawable = { y: number; draw: () => void }
      const layer: Drawable[] = []
      for (const p of props) {
        const f = FURNITURE_BY_ID[p.item]
        if (!f || f.flat) continue
        layer.push({
          y: p.y,
          draw: () => {
            ctx.save()
            ctx.translate(p.x, p.y)
            f.draw(ctx, t)
            ctx.restore()
          },
        })
      }
      const cast = [...players.current.values()]
      for (const p of cast) {
        if (p.equipped.puffle) layer.push({ y: p.puffleY, draw: () => drawPlayerPuffle(ctx, p, now) })
        layer.push({ y: p.y, draw: () => drawPenguin(ctx, p, now, { self: p.id === profile.id }) })
      }
      layer.sort((a, b) => a.y - b.y)
      for (const item of layer) item.draw()

      for (const s of snowballs.current) {
        drawSnowball(ctx, s, now)
        drawSplat(ctx, s, now)
      }
      for (const p of cast) drawBubble(ctx, p, now)

      if (decoratingRef.current) {
        const sel = selectedRef.current
        const list = draftRef.current
        if (sel !== null && list[sel]) drawFurnitureHighlight(ctx, list[sel], t)
      }

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', fit)
    }
  }, [hovered, step, players, snowballs, profile.id])

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

  const clampFloor = useCallback(
    (x: number, y: number) => ({
      x: Math.max(60, Math.min(WORLD_W - 60, x)),
      y: Math.max(room.walk.y1 - 60, Math.min(WORLD_H - 20, y)),
    }),
    [room],
  )

  const onPointerMove = (e: React.PointerEvent) => {
    const { x, y } = toWorld(e.clientX, e.clientY)

    if (decorating) {
      if (dragging.current && selected !== null) {
        const pos = clampFloor(x, y)
        setDraft((list) => list.map((p, i) => (i === selected ? { ...p, x: pos.x, y: pos.y } : p)))
        setDirty(true)
      }
      return
    }

    const idx = hotspotAt(x, y)
    if (idx !== hovered) setHovered(idx)
  }

  const openCardFor = (p: PlayerState) => {
    setOverlay({
      kind: 'card',
      target: {
        id: p.id,
        username: p.username,
        color: p.color,
        equipped: p.equipped,
        puffleName: p.equipped.puffle
          ? p.id === profile.id
            ? profile.puffleNames[p.equipped.puffle]
            : undefined
          : undefined,
      },
    })
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (overlayRef.current) return
    const { x, y } = toWorld(e.clientX, e.clientY)

    // Decorating takes over the canvas entirely.
    if (decorating) {
      if (held) {
        const pos = clampFloor(x, y)
        setDraft((list) => [...list, { item: held, x: pos.x, y: pos.y }])
        setSelected(draft.length)
        setHeld(null)
        setDirty(true)
        return
      }
      // Prefer whatever is drawn in front (largest y).
      let pick: number | null = null
      draft.forEach((p, i) => {
        if (hitsFurniture(p, x, y) && (pick === null || p.y >= draft[pick].y)) pick = i
      })
      setSelected(pick)
      dragging.current = pick !== null
      return
    }

    const idx = hotspotAt(x, y)
    if (idx >= 0) {
      const action = room.hotspots[idx].action
      setHovered(-1)
      if (action.type === 'room') setRoomId(action.room)
      else if (action.type === 'shop') setOverlay({ kind: 'shop' })
      else if (action.type === 'puffles') setOverlay({ kind: 'shop', tab: 'puffle' })
      else if (action.type === 'decorate') startDecorating()
      else setOverlay({ kind: 'game', game: action.game })
      return
    }

    if (snowballRef.current) {
      throwSnowball(x, y)
      setSnowballMode(false)
      return
    }

    // Clicking a penguin opens their card; the nearest one in front wins.
    const clicked = [...players.current.values()]
      .filter((p) => hitsPenguin(p, x, y))
      .sort((a, b) => b.y - a.y)[0]
    if (clicked) {
      openCardFor(clicked)
      return
    }

    moveTo(x, y)
  }

  const onPointerUp = () => {
    dragging.current = false
  }

  // --- keyboard ------------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = document.activeElement?.tagName === 'INPUT'
      if (e.key === 'Enter' && !typing && !decoratingRef.current) {
        e.preventDefault()
        inputRef.current?.focus()
        return
      }
      if (e.key === 'Escape') {
        setSnowballMode(false)
        setHeld(null)
        ;(document.activeElement as HTMLElement | null)?.blur()
        return
      }
      if (typing || overlayRef.current) return

      if (decoratingRef.current) {
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRef.current !== null) {
          e.preventDefault()
          deleteSelected()
        }
        return
      }
      if (e.key === 'd' || e.key === 'D') doEmote('dance')
      if (e.key === 'w' || e.key === 'W') doEmote('wave')
      if (e.key === 's' || e.key === 'S') doEmote('sit')
      if (e.key === 't' || e.key === 'T') setSnowballMode((v) => !v)
      if (e.key === 'm' || e.key === 'M') setOverlay({ kind: 'map' })
      if (e.key === 'f' || e.key === 'F') setOverlay({ kind: 'friends' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doEmote])

  // --- igloo editing -------------------------------------------------------
  const startDecorating = () => {
    if (!iglooData) return
    setDraft(iglooData.items)
    setDraftStyle(iglooData.style)
    setDecorating(true)
    setDirty(false)
    setSelected(null)
    setHeld(null)
    setIglooError(null)
  }

  const deleteSelected = () => {
    setDraft((list) => list.filter((_, i) => i !== selectedRef.current))
    setSelected(null)
    setDirty(true)
  }

  const saveIgloo = async () => {
    setSaving(true)
    setIglooError(null)
    try {
      await saveIglooApi(draftStyle, draft)
      setIglooData((d) => (d ? { ...d, items: draft, style: draftStyle } : d))
      setDirty(false)
    } catch (err) {
      setIglooError(err instanceof Error ? err.message : 'Could not save your igloo.')
    } finally {
      setSaving(false)
    }
  }

  const goHome = () => {
    setOverlay(null)
    setRoomId(iglooRoomId(profile.id))
  }

  // --- chat ----------------------------------------------------------------
  const submitChat = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    say(text)
    setText('')
  }

  const look = { color: profile.color, equipped: profile.equipped as Equipped }
  const friendIds = useMemo(() => new Set(friends.map((f) => f.id)), [friends])

  const runFriendAction = async (fn: () => Promise<void>) => {
    setFriendBusy(true)
    try {
      await fn()
    } finally {
      setFriendBusy(false)
    }
  }

  return (
    <div className="world">
      <header className="hud">
        <div className="hud-left">
          <span className="room-name">{room.name}</span>
          <span
            className={connected ? 'dot online' : 'dot offline'}
            title={connected ? 'Connected' : 'Reconnecting…'}
          />
          <span className="muted small">
            {online} here · {island.count} on the island
          </span>
        </div>

        <div className="hud-right">
          <span className="coins" title="Coins">
            <span className="coin-icon">◎</span> {profile.coins.toLocaleString()}
          </span>
          <button className="btn ghost" onClick={() => setOverlay({ kind: 'map' })} title="M">
            Map
          </button>
          <button className="btn ghost" onClick={() => setOverlay({ kind: 'friends' })} title="F">
            Friends
            {requests.length > 0 && <span className="badge">{requests.length}</span>}
          </button>
          <button className="btn ghost" onClick={goHome}>
            Igloo
          </button>
          <button className="btn ghost" onClick={() => setOverlay({ kind: 'shop' })}>
            Wardrobe
          </button>
          <button className="btn ghost" onClick={onSignOut}>
            Sign out
          </button>
          <span className="dedication" title="Made for Charlotte">
            For <strong>Charlotte</strong> ♥
          </span>
        </div>
      </header>

      <div className="stage-wrap">
        <canvas
          ref={canvasRef}
          className={`stage${hovered >= 0 ? ' pointing' : ''}${snowballMode ? ' aiming' : ''}${
            decorating ? ' decorating' : ''
          }`}
          onPointerMove={onPointerMove}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerLeave={() => {
            setHovered(-1)
            dragging.current = false
          }}
        />

        <aside className="chat-log">
          <h3>Chat</h3>
          <ul>
            {chatLog.length === 0 && (
              <li className="muted">Say hello — everyone in the room will see it.</li>
            )}
            {chatLog.map((line, i) => (
              <li key={`${line.at}-${i}`}>
                <strong className={line.id === profile.id ? 'me' : ''}>{line.name}</strong>{' '}
                {line.text}
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {decorating ? (
        <IglooEditor
          inventory={inventory}
          placed={draft}
          held={held}
          selected={selected}
          style={draftStyle}
          dirty={dirty}
          saving={saving}
          error={iglooError}
          onHold={setHeld}
          onDeleteSelected={deleteSelected}
          onStyle={(id) => {
            setDraftStyle(id)
            setDirty(true)
          }}
          onSave={saveIgloo}
          onExit={() => {
            setDecorating(false)
            setSelected(null)
            setHeld(null)
          }}
          onShop={() => setOverlay({ kind: 'shop', tab: 'furniture' })}
        />
      ) : (
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
            {isMyIgloo && (
              <button className="chip highlight" onClick={startDecorating}>
                🛋️ Decorate
              </button>
            )}
          </div>
        </footer>
      )}

      {overlay?.kind === 'shop' && (
        <Shop
          profile={profile}
          inventory={inventory}
          initialTab={overlay.tab}
          onBuy={onBuy}
          onEquip={onEquip}
          onRenamePuffle={onRenamePuffle}
          onClose={() => setOverlay(null)}
        />
      )}

      {overlay?.kind === 'map' && (
        <MapPanel
          current={roomId}
          online={island.online}
          onTravel={(r) => {
            setRoomId(r)
            setOverlay(null)
          }}
          onGoHome={goHome}
          onClose={() => setOverlay(null)}
        />
      )}

      {overlay?.kind === 'friends' && (
        <FriendsPanel
          friends={friends}
          requests={requests}
          online={island.online}
          busy={friendBusy}
          onAccept={(id) => void runFriendAction(() => onAcceptFriend(id))}
          onDecline={(id) => void runFriendAction(() => onDeclineFriend(id))}
          onRemove={(id) => void runFriendAction(() => onRemoveFriend(id))}
          onGoTo={(r) => {
            setRoomId(r)
            setOverlay(null)
          }}
          onVisitIgloo={(f) => {
            setRoomId(iglooRoomId(f.id))
            setOverlay(null)
          }}
          onClose={() => setOverlay(null)}
        />
      )}

      {overlay?.kind === 'card' && (
        <PlayerCard
          target={overlay.target}
          isSelf={overlay.target.id === profile.id}
          isFriend={friendIds.has(overlay.target.id)}
          requestSent={sentRequests.has(overlay.target.id)}
          onRenamePuffle={overlay.target.id === profile.id ? onRenamePuffle : undefined}
          onAddFriend={async () => {
            await onAddFriend(overlay.target.id)
            setSentRequests((s) => new Set(s).add(overlay.target.id))
          }}
          onRemoveFriend={() => onRemoveFriend(overlay.target.id)}
          onVisitIgloo={() => {
            setRoomId(iglooRoomId(overlay.target.id))
            setOverlay(null)
          }}
          onClose={() => setOverlay(null)}
        />
      )}

      {overlay?.kind === 'game' && overlay.game === 'sled' && (
        <SledRush look={look} onAward={(s) => onAward('sled', s)} onExit={() => setOverlay(null)} />
      )}
      {overlay?.kind === 'game' && overlay.game === 'fishing' && (
        <IceFishing look={look} onAward={(s) => onAward('fishing', s)} onExit={() => setOverlay(null)} />
      )}
      {overlay?.kind === 'game' && overlay.game === 'coffee' && (
        <CoffeeRush look={look} onAward={(s) => onAward('coffee', s)} onExit={() => setOverlay(null)} />
      )}
    </div>
  )
}
