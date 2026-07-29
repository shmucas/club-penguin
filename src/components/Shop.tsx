import { useEffect, useMemo, useRef, useState } from 'react'
import type { Equipped, Profile, Slot } from '../lib/types'
import { ITEMS, ITEMS_BY_ID, SLOT_LABELS, itemSwatch } from '../game/items'
import { drawPenguinPreview } from '../game/render'

interface Props {
  profile: Profile
  inventory: Set<string>
  onBuy: (itemId: string) => Promise<void>
  onEquip: (slot: Slot | 'color', itemId: string | null) => Promise<void>
  onClose: () => void
}

const TABS: Array<Slot | 'color'> = ['color', 'hat', 'shirt', 'neck', 'hand', 'feet']

/** A tiny penguin wearing exactly one item, for the grid tiles. */
function ItemTile({
  itemId,
  baseColor,
  owned,
  equipped,
  cost,
  affordable,
  onClick,
  busy,
}: {
  itemId: string
  baseColor: string
  owned: boolean
  equipped: boolean
  cost: number
  affordable: boolean
  onClick: () => void
  busy: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const item = ITEMS_BY_ID[itemId]
  const isColor = item.slot === 'color'

  useEffect(() => {
    if (isColor) return
    let raf = 0
    const frame = (now: number) => {
      if (canvasRef.current) {
        drawPenguinPreview(
          canvasRef.current,
          { color: baseColor, equipped: { [item.slot as Slot]: itemId } as Equipped },
          now,
          0.95,
        )
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [itemId, baseColor, isColor, item.slot])

  return (
    <button
      className={`tile${equipped ? ' equipped' : ''}${owned ? ' owned' : ''}`}
      onClick={onClick}
      disabled={busy || (!owned && !affordable)}
      title={owned ? (equipped ? 'Click to take off' : 'Click to wear') : `Buy for ${cost} coins`}
    >
      <div className="tile-art">
        {isColor ? (
          <span className="tile-swatch" style={{ background: itemSwatch(itemId) }} />
        ) : (
          <canvas ref={canvasRef} className="tile-canvas" />
        )}
      </div>
      <span className="tile-name">{item.name}</span>
      {owned ? (
        <span className="tile-tag">{equipped ? 'Wearing' : 'Owned'}</span>
      ) : (
        <span className={affordable ? 'tile-price' : 'tile-price short'}>◎ {cost}</span>
      )}
    </button>
  )
}

export function Shop({ profile, inventory, onBuy, onEquip, onClose }: Props) {
  const [tab, setTab] = useState<Slot | 'color'>('color')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const previewRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let raf = 0
    const frame = (now: number) => {
      if (previewRef.current) {
        drawPenguinPreview(previewRef.current, { color: profile.color, equipped: profile.equipped }, now, 2.2)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [profile.color, profile.equipped])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const shown = useMemo(() => ITEMS.filter((i) => i.slot === tab), [tab])

  const handle = async (itemId: string) => {
    const item = ITEMS_BY_ID[itemId]
    setBusy(true)
    setError(null)
    try {
      if (!inventory.has(itemId)) {
        await onBuy(itemId)
        await onEquip(item.slot, itemId)
      } else if (item.slot === 'color') {
        if (profile.color !== itemId) await onEquip('color', itemId)
      } else {
        const worn = profile.equipped[item.slot as Slot] === itemId
        await onEquip(item.slot, worn ? null : itemId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work.')
    } finally {
      setBusy(false)
    }
  }

  const isEquipped = (itemId: string) => {
    const item = ITEMS_BY_ID[itemId]
    return item.slot === 'color'
      ? profile.color === itemId
      : profile.equipped[item.slot as Slot] === itemId
  }

  return (
    <div className="overlay">
      <div className="shop-panel">
        <header className="shop-head">
          <h2>Gift Shop</h2>
          <div className="shop-head-right">
            <span className="coins">
              <span className="coin-icon">◎</span> {profile.coins.toLocaleString()}
            </span>
            <button className="btn ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </header>

        <div className="shop-body">
          <div className="shop-preview">
            <canvas ref={previewRef} className="preview-canvas tall" />
            <p className="preview-name">{profile.username}</p>
            <ul className="worn-list">
              {(['hat', 'shirt', 'neck', 'hand', 'feet'] as Slot[]).map((slot) => {
                const id = profile.equipped[slot]
                return (
                  <li key={slot}>
                    <span className="worn-slot">{SLOT_LABELS[slot]}</span>
                    {id ? (
                      <button className="link" onClick={() => handle(id)} disabled={busy}>
                        {ITEMS_BY_ID[id]?.name ?? id} ✕
                      </button>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="shop-main">
            <nav className="shop-tabs">
              {TABS.map((t) => (
                <button key={t} className={tab === t ? 'tab active' : 'tab'} onClick={() => setTab(t)}>
                  {SLOT_LABELS[t]}
                </button>
              ))}
            </nav>

            {error && <p className="error-line">{error}</p>}

            <div className="tile-grid">
              {shown.map((item) => (
                <ItemTile
                  key={item.id}
                  itemId={item.id}
                  baseColor={profile.color}
                  owned={inventory.has(item.id)}
                  equipped={isEquipped(item.id)}
                  cost={item.cost}
                  affordable={profile.coins >= item.cost}
                  onClick={() => handle(item.id)}
                  busy={busy}
                />
              ))}
            </div>

            <p className="muted small shop-hint">
              Short on coins? Sled Rush, Ice Fishing and Coffee Rush all pay out.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
