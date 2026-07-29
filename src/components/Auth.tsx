import { useEffect, useRef, useState, type FormEvent } from 'react'
import { logIn, signUp, type Me } from '../lib/api'
import { paintTitleScene } from '../game/rooms'
import { WORLD_H, WORLD_W, drawPenguin } from '../game/render'
import type { PlayerState } from '../lib/types'

type Mode = 'in' | 'up'

/** Two penguins waddling about behind the login card. */
function useTitleBackdrop(canvasRef: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cast: PlayerState[] = [
      { id: 'a', username: '', color: 'color_red', equipped: { hat: 'hat_beanie', neck: 'neck_scarf' }, x: 300, y: 640, tx: 300, ty: 640, dir: 1, emote: null, emoteAt: 0, bubble: null, bubbleAt: 0, puffleX: 0, puffleY: 0, puffleHop: 0 },
      { id: 'b', username: '', color: 'color_green', equipped: { hat: 'hat_propeller' }, x: 980, y: 610, tx: 980, ty: 610, dir: -1, emote: null, emoteAt: 0, bubble: null, bubbleAt: 0, puffleX: 0, puffleY: 0, puffleHop: 0 },
      { id: 'c', username: '', color: 'color_yellow', equipped: { neck: 'neck_cape', hand: 'hand_balloon' }, x: 640, y: 680, tx: 640, ty: 680, dir: 1, emote: null, emoteAt: 0, bubble: null, bubbleAt: 0, puffleX: 0, puffleY: 0, puffleHop: 0 },
    ]

    let raf = 0
    let last = performance.now()
    let retarget = 0

    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(WORLD_W * dpr)
      canvas.height = Math.round(WORLD_H * dpr)
    }
    fit()
    window.addEventListener('resize', fit)

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const scale = canvas.width / WORLD_W
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      paintTitleScene(ctx, now / 1000)

      if (now > retarget) {
        retarget = now + 2600
        for (const p of cast) {
          p.tx = 180 + Math.random() * (WORLD_W - 360)
          p.ty = 580 + Math.random() * 100
          if (Math.abs(p.tx - p.x) > 10) p.dir = p.tx > p.x ? 1 : -1
          if (Math.random() > 0.7) {
            p.emote = 'wave'
            p.emoteAt = now
          }
        }
      }
      for (const p of cast) {
        const dx = p.tx - p.x
        const dy = p.ty - p.y
        const d = Math.hypot(dx, dy)
        if (d > 1) {
          const step = Math.min(d, 120 * dt)
          p.x += (dx / d) * step
          p.y += (dy / d) * step
        }
      }
      for (const p of [...cast].sort((a, b) => a.y - b.y)) {
        drawPenguin(ctx, p, now, { showName: false })
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', fit)
    }
  }, [canvasRef])
}

interface Props {
  /** Called with the fresh session once the account is created or logged in. */
  onAuthed: (me: Me) => void
}

export function Auth({ onAuthed }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useTitleBackdrop(canvasRef)

  const [mode, setMode] = useState<Mode>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      onAuthed(mode === 'up' ? await signUp(email, password) : await logIn(email, password))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="title-screen">
      <canvas ref={canvasRef} className="title-canvas" />
      <div className="title-overlay">
        <div className="logo">
          <span className="logo-snow">Snowfall</span>
          <span className="logo-island">Island</span>
        </div>
        <p className="tagline">Waddle around. Chat. Throw snowballs. Buy silly hats.</p>

        <form className="card auth-card" onSubmit={submit}>
          <div className="tabs">
            <button
              type="button"
              className={mode === 'in' ? 'tab active' : 'tab'}
              onClick={() => setMode('in')}
            >
              Log in
            </button>
            <button
              type="button"
              className={mode === 'up' ? 'tab active' : 'tab'}
              onClick={() => setMode('up')}
            >
              Create account
            </button>
          </div>

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
              required
              minLength={6}
              placeholder="at least 6 characters"
            />
          </label>

          {error && <p className="error-line">{error}</p>}

          <button className="btn primary big" disabled={busy} type="submit">
            {busy ? 'Just a sec…' : mode === 'up' ? 'Create my penguin' : 'Enter the island'}
          </button>
        </form>
      </div>
    </div>
  )
}
