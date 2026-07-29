import { useEffect, useRef } from 'react'
import { FURNITURE, IGLOO_STYLES, drawFurniturePreview, type PlacedItem } from '../game/furniture'

interface Props {
  inventory: Set<string>
  placed: PlacedItem[]
  held: string | null
  selected: number | null
  style: string
  dirty: boolean
  saving: boolean
  error: string | null
  onHold: (id: string | null) => void
  onDeleteSelected: () => void
  onStyle: (id: string) => void
  onSave: () => void
  onExit: () => void
  onShop: () => void
}

function FurnitureTile({
  id,
  active,
  onClick,
}: {
  id: string
  active: boolean
  onClick: () => void
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let raf = 0
    const frame = (now: number) => {
      if (ref.current) drawFurniturePreview(ref.current, id, now)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [id])
  return (
    <button className={active ? 'furn-tile active' : 'furn-tile'} onClick={onClick}>
      <canvas ref={ref} className="furn-canvas" />
    </button>
  )
}

export function IglooEditor({
  inventory,
  placed,
  held,
  selected,
  style,
  dirty,
  saving,
  error,
  onHold,
  onDeleteSelected,
  onStyle,
  onSave,
  onExit,
  onShop,
}: Props) {
  const owned = FURNITURE.filter((f) => inventory.has(f.id))
  const ownedStyles = IGLOO_STYLES.filter((s) => inventory.has(s.id))

  return (
    <div className="igloo-editor">
      <div className="editor-row">
        <div className="editor-title">
          <strong>Decorating</strong>
          <span className="muted small">
            {held
              ? 'Click the floor to put it down'
              : selected !== null
                ? 'Drag to move it, or press Delete'
                : `${placed.length} piece${placed.length === 1 ? '' : 's'} placed`}
          </span>
        </div>

        <div className="editor-actions">
          {selected !== null && (
            <button className="btn ghost tiny" onClick={onDeleteSelected}>
              Put away
            </button>
          )}
          {held && (
            <button className="btn ghost tiny" onClick={() => onHold(null)}>
              Cancel
            </button>
          )}
          <button className="btn primary" disabled={!dirty || saving} onClick={onSave}>
            {saving ? 'Saving…' : dirty ? 'Save igloo' : 'Saved'}
          </button>
          <button className="btn ghost" onClick={onExit}>
            Done
          </button>
        </div>
      </div>

      {error && <p className="error-line">{error}</p>}

      {ownedStyles.length > 1 && (
        <div className="editor-row styles">
          <span className="muted small">Style</span>
          {ownedStyles.map((s) => (
            <button
              key={s.id}
              className={style === s.id ? 'chip active' : 'chip'}
              onClick={() => onStyle(s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div className="furn-strip">
        {owned.length === 0 ? (
          <p className="muted small">
            You haven't bought any furniture yet — the Gift Shop has a Furniture aisle.
          </p>
        ) : (
          owned.map((f) => (
            <FurnitureTile
              key={f.id}
              id={f.id}
              active={held === f.id}
              onClick={() => onHold(held === f.id ? null : f.id)}
            />
          ))
        )}
        <button className="furn-tile buy" onClick={onShop} title="Buy more furniture">
          <span>＋</span>
        </button>
      </div>
    </div>
  )
}
