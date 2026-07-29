import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { drawPenguinPreview } from '../game/render'
import { PENGUIN_COLORS } from '../game/palette'
import { ITEMS_BY_ID } from '../game/items'

interface Props {
  userId: string
  onCreated: () => void
  onSignOut: () => void
}

const STARTER_COLORS = Object.keys(PENGUIN_COLORS)

export function CreatePenguin({ onCreated, onSignOut }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [username, setUsername] = useState('')
  const [color, setColor] = useState('color_blue')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let raf = 0
    const frame = (now: number) => {
      if (canvasRef.current) drawPenguinPreview(canvasRef.current, { color, equipped: {} }, now, 2.1)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [color])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const name = username.trim()
    if (!/^[A-Za-z0-9 _-]{3,16}$/.test(name)) {
      setError('Names are 3–16 characters: letters, numbers, spaces, - or _')
      return
    }
    setBusy(true)
    setError(null)
    const { error: rpcError } = await supabase.rpc('create_penguin', {
      p_username: name,
      p_color: color,
    })
    setBusy(false)
    if (rpcError) {
      setError(
        rpcError.message.includes('taken') || rpcError.code === '23505'
          ? 'That name is already waddling around. Try another.'
          : rpcError.message,
      )
      return
    }
    onCreated()
  }

  return (
    <div className="centered-screen">
      <form className="card create-card" onSubmit={submit}>
        <h1>Make your penguin</h1>
        <p className="muted">You can buy more colours and clothes in the Gift Shop later.</p>

        <div className="create-body">
          <div className="preview-box">
            <canvas ref={canvasRef} className="preview-canvas" />
          </div>

          <div className="create-fields">
            <label>
              Penguin name
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={16}
                placeholder="SnowballKing"
                autoFocus
              />
            </label>

            <span className="field-label">Colour</span>
            <div className="swatches">
              {STARTER_COLORS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={color === id ? 'swatch selected' : 'swatch'}
                  style={{ background: PENGUIN_COLORS[id] }}
                  onClick={() => setColor(id)}
                  aria-label={ITEMS_BY_ID[id]?.name ?? id}
                  title={ITEMS_BY_ID[id]?.name ?? id}
                />
              ))}
            </div>
          </div>
        </div>

        {error && <p className="error-line">{error}</p>}

        <div className="create-actions">
          <button className="btn primary big" disabled={busy} type="submit">
            {busy ? 'Hatching…' : 'Start waddling'}
          </button>
          <button className="btn ghost" type="button" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </form>
    </div>
  )
}
