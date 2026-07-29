import { useEffect, useMemo, useRef, useState } from 'react'
import type { Equipped, Profile, Slot, WearSlot } from '../lib/types'
import { ITEMS, ITEMS_BY_ID, SLOT_LABELS, itemSwatch } from '../game/items'
import { drawPenguinPreview } from '../game/render'
import { drawPufflePreview } from '../game/puffles'
import { drawFurniturePreview } from '../game/furniture'

type Tab = Slot | 'color' | 'furniture' | 'igloo'

interface Props {
  profile: Profile
  inventory: Set<string>
  initialTab?: Tab
  onBuy: (itemId: string) => Promise<void>
  onEquip: (slot: Slot | 'color', itemId: string | null) => Promise<void>
  onRenamePuffle: (puffleId: string, name: string) => Promise<void>
  onClose: () => void
}

const TABS: Tab[] = ['color', 'hat', 'shirt', 'neck', 'hand', 'feet', 'puffle', 'furniture', 'igloo']

/** A preview of one item — a dressed penguin, a puffle, or a piece of furniture. */
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
  const kind = item.slot === 'color' || item.slot === 'igloo' ? 'swatch' : item.slot

  useEffect(() => {
    if (kind === 'swatch') return
    let raf = 0
    const frame = (now: number) => {
      const canvas = canvasRef.current
      if (canvas) {
        if (kind === 'puffle') drawPufflePreview(canvas, itemId, now, 1.15)
        else if (kind === 'furniture') drawFurniturePreview(canvas, itemId, now)
        else
          drawPenguinPreview(
            canvas,
            { color: baseColor, equipped: { [item.slot as WearSlot]: itemId } as Equipped },
            now,
            0.95,
          )
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [itemId, baseColor, kind, item.slot])

  const hint = owned
    ? item.slot === 'furniture'
      ? 'Place it from your igloo'
      : item.slot === 'igloo'
        ? 'Choose it while decorating'
        : equipped
          ? 'Click to take off'
          : 'Click to wear'
    : `Buy for ${cost} coins`

  return (
    <button
      className={`tile${equipped ? ' equipped' : ''}${owned ? ' owned' : ''}`}
      onClick={onClick}
      disabled={busy || (!owned && !affordable)}
      title={hint}
    >
      <div className="tile-art">
        {kind === 'swatch' ? (
          <span
            className={item.slot === 'igloo' ? 'tile-swatch igloo' : 'tile-swatch'}
            style={{ background: item.slot === 'igloo' ? undefined : itemSwatch(itemId) }}
          >
            {item.slot === 'igloo' ? '⌂' : ''}
          </span>
        ) : (
          <canvas ref={canvasRef} className="tile-canvas" />
        )}
      </div>
      <span className="tile-name">{item.name}</span>
      {owned ? (
        <span className="tile-tag">{equipped ? 'Out with you' : 'Owned'}</span>
      ) : (
        <span className={affordable ? 'tile-price' : 'tile-price short'}>◎ {cost}</span>
      )}
    </button>
  )
}

export function Shop({
  profile,
  inventory,
  initialTab,
  onBuy,
  onEquip,
  onRenamePuffle,
  onClose,
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab ?? 'color')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const previewRef = useRef<HTMLCanvasElement>(null)
  const pufflePreviewRef = useRef<HTMLCanvasElement>(null)

  const activePuffle = profile.equipped.puffle

  useEffect(() => {
    setNameDraft(activePuffle ? (profile.puffleNames[activePuffle] ?? '') : '')
  }, [activePuffle, profile.puffleNames])

  useEffect(() => {
    let raf = 0
    const frame = (now: number) => {
      if (previewRef.current) {
        drawPenguinPreview(previewRef.current, { color: profile.color, equipped: profile.equipped }, now, 2.2)
      }
      if (pufflePreviewRef.current && activePuffle) {
        drawPufflePreview(pufflePreviewRef.current, activePuffle, now, 1.2)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [profile.color, profile.equipped, activePuffle])

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
        // Furniture and igloo styles are chosen later, in the igloo editor.
        if (item.slot !== 'furniture' && item.slot !== 'igloo') {
          await onEquip(item.slot as Slot | 'color', itemId)
        }
      } else if (item.slot === 'color') {
        if (profile.color !== itemId) await onEquip('color', itemId)
      } else if (item.slot === 'furniture' || item.slot === 'igloo') {
        setError(
          item.slot === 'furniture'
            ? 'You own that — go to your igloo and press Decorate to place it.'
            : 'You own that style — pick it while decorating your igloo.',
        )
      } else {
        const slot = item.slot as Slot
        const worn = slot === 'puffle' ? profile.equipped.puffle === itemId : profile.equipped[slot] === itemId
        await onEquip(slot, worn ? null : itemId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work.')
    } finally {
      setBusy(false)
    }
  }

  const isEquipped = (itemId: string) => {
    const item = ITEMS_BY_ID[itemId]
    if (item.slot === 'color') return profile.color === itemId
    if (item.slot === 'furniture' || item.slot === 'igloo') return false
    return profile.equipped[item.slot as Slot] === itemId
  }

  const saveName = async () => {
    if (!activePuffle) return
    setBusy(true)
    try {
      await onRenamePuffle(activePuffle, nameDraft)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that name.')
    } finally {
      setBusy(false)
    }
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
              {(['hat', 'shirt', 'neck', 'hand', 'feet'] as WearSlot[]).map((slot) => {
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

            {activePuffle && (
              <div className="puffle-box">
                <canvas ref={pufflePreviewRef} className="puffle-canvas" />
                <div className="puffle-name-field">
                  <label>
                    Puffle name
                    <input
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onBlur={saveName}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void saveName()
                      }}
                      maxLength={16}
                      placeholder={ITEMS_BY_ID[activePuffle]?.name ?? 'Puffle'}
                    />
                  </label>
                </div>
              </div>
            )}
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
              {tab === 'furniture'
                ? 'Buy furniture here, then go to your igloo and press Decorate to place it.'
                : tab === 'puffle'
                  ? 'Puffles follow you everywhere. Click one you own to put it away or bring it back out.'
                  : 'Short on coins? Sled Rush, Ice Fishing and Coffee Rush all pay out.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
