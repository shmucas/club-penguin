import { useEffect, useRef, useState } from 'react'
import type { Equipped } from '../lib/types'
import { drawPenguinPreview } from '../game/render'
import { drawPufflePreview, puffleMood } from '../game/puffles'
import { ITEMS_BY_ID, SLOT_LABELS } from '../game/items'
import type { WearSlot } from '../lib/types'

export interface CardTarget {
  id: string
  username: string
  color: string
  equipped: Equipped
  puffleName?: string
}

interface Props {
  target: CardTarget
  isSelf: boolean
  isFriend: boolean
  requestSent: boolean
  onAddFriend: () => Promise<void>
  onRemoveFriend: () => Promise<void>
  onVisitIgloo: () => void
  onClose: () => void
  /** Only passed for your own card. */
  onRenamePuffle?: (puffleId: string, name: string) => Promise<void>
}

export function PlayerCard({
  target,
  isSelf,
  isFriend,
  requestSent,
  onAddFriend,
  onRemoveFriend,
  onVisitIgloo,
  onClose,
  onRenamePuffle,
}: Props) {
  const penguinRef = useRef<HTMLCanvasElement>(null)
  const puffleRef = useRef<HTMLCanvasElement>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState(target.puffleName ?? '')

  useEffect(() => {
    let raf = 0
    const frame = (now: number) => {
      if (penguinRef.current) {
        drawPenguinPreview(penguinRef.current, { color: target.color, equipped: target.equipped }, now, 1.9)
      }
      if (puffleRef.current && target.equipped.puffle) {
        drawPufflePreview(puffleRef.current, target.equipped.puffle, now, 1.3)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [target])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const act = async (fn: () => Promise<void>, message: string) => {
    setBusy(true)
    setNote(null)
    try {
      await fn()
      setNote(message)
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'That did not work.')
    } finally {
      setBusy(false)
    }
  }

  const worn = (['hat', 'shirt', 'neck', 'hand', 'feet'] as WearSlot[])
    .map((slot) => ({ slot, id: target.equipped[slot] }))
    .filter((x): x is { slot: WearSlot; id: string } => Boolean(x.id))

  const puffleId = target.equipped.puffle

  return (
    <div className="overlay" onPointerDown={onClose}>
      <div className="player-card" onPointerDown={(e) => e.stopPropagation()}>
        <header className="card-head">
          <h2>{target.username}</h2>
          <button className="btn ghost" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="card-body">
          <div className="card-portrait">
            <canvas ref={penguinRef} className="preview-canvas" />
          </div>

          <div className="card-details">
            <h4>Wearing</h4>
            {worn.length === 0 ? (
              <p className="muted small">Nothing but feathers.</p>
            ) : (
              <ul className="worn-list">
                {worn.map(({ slot, id }) => (
                  <li key={slot}>
                    <span className="worn-slot">{SLOT_LABELS[slot]}</span>
                    <span>{ITEMS_BY_ID[id]?.name ?? id}</span>
                  </li>
                ))}
              </ul>
            )}

            {puffleId && (
              <div className="card-puffle">
                <canvas ref={puffleRef} className="card-puffle-canvas" />
                <div className="card-puffle-meta">
                  {isSelf && onRenamePuffle ? (
                    <input
                      className="puffle-inline-name"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onBlur={() => void onRenamePuffle(puffleId, nameDraft)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                      }}
                      maxLength={16}
                      placeholder={ITEMS_BY_ID[puffleId]?.name ?? 'Name your puffle'}
                    />
                  ) : (
                    <strong>{target.puffleName || ITEMS_BY_ID[puffleId]?.name || 'Puffle'}</strong>
                  )}
                  <p className="muted small">{puffleMood(puffleId, target.id)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {note && <p className="notice-line card-note">{note}</p>}

        <footer className="card-actions">
          <button className="btn primary" onClick={onVisitIgloo}>
            Visit igloo
          </button>
          {!isSelf &&
            (isFriend ? (
              <button
                className="btn ghost dark"
                disabled={busy}
                onClick={() => act(onRemoveFriend, 'Removed from your friends.')}
              >
                Remove friend
              </button>
            ) : (
              <button
                className="btn ghost dark"
                disabled={busy || requestSent}
                onClick={() => act(onAddFriend, 'Friend request sent!')}
              >
                {requestSent ? 'Request sent' : 'Add friend'}
              </button>
            ))}
        </footer>
      </div>
    </div>
  )
}
