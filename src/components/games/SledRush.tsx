import { useCallback, useEffect, useRef, useState } from 'react'
import type { Equipped, PlayerState } from '../../lib/types'
import { drawPenguin } from '../../game/render'
import { withAlpha } from '../../game/palette'
import { rnd } from '../../game/scenery'
import { GAME_H, GAME_W, GameFrame, type GamePhase, getCtx, pointerPos, useGameCanvas } from './GameFrame'

interface Obstacle {
  x: number
  y: number
  kind: 'tree' | 'rock' | 'coin'
  taken?: boolean
}

interface Props {
  look: { color: string; equipped: Equipped }
  onAward: (score: number) => Promise<number | null>
  onExit: () => void
}

const SLED_Y = GAME_H - 110

export function SledRush({ look, onAward, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useGameCanvas(canvasRef)

  const [phase, setPhase] = useState<GamePhase>('intro')
  const [score, setScore] = useState(0)
  const [coinsAwarded, setCoinsAwarded] = useState<number | null>(null)
  const [awardError, setAwardError] = useState<string | null>(null)

  const state = useRef({
    x: GAME_W / 2,
    targetX: GAME_W / 2,
    scroll: 0,
    speed: 220,
    distance: 0,
    picked: 0,
    obstacles: [] as Obstacle[],
    nextRow: 0,
    keys: { left: false, right: false },
    dead: false,
  })

  const start = useCallback(() => {
    state.current = {
      x: GAME_W / 2,
      targetX: GAME_W / 2,
      scroll: 0,
      speed: 220,
      distance: 0,
      picked: 0,
      obstacles: [],
      nextRow: 0,
      keys: { left: false, right: false },
      dead: false,
    }
    setScore(0)
    setCoinsAwarded(null)
    setAwardError(null)
    setPhase('playing')
  }, [])

  const finish = useCallback(
    async (finalScore: number) => {
      setPhase('over')
      setScore(finalScore)
      try {
        const coins = await onAward(finalScore)
        setCoinsAwarded(coins)
      } catch (err) {
        setAwardError(err instanceof Error ? err.message : 'Could not bank those coins.')
      }
    },
    [onAward],
  )

  useEffect(() => {
    if (phase !== 'playing') return
    const canvas = canvasRef.current
    if (!canvas) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') state.current.keys.left = true
      if (e.key === 'ArrowRight' || e.key === 'd') state.current.keys.right = true
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') state.current.keys.left = false
      if (e.key === 'ArrowRight' || e.key === 'd') state.current.keys.right = false
    }
    const onMove = (e: PointerEvent) => {
      state.current.targetX = pointerPos(canvas, e).x
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    canvas.addEventListener('pointermove', onMove)

    let raf = 0
    let last = performance.now()

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const s = state.current
      const ctx = getCtx(canvas)
      if (!ctx) return

      // --- update -----------------------------------------------------------
      s.speed = Math.min(620, 220 + s.distance * 0.05)
      s.distance += s.speed * dt
      s.scroll += s.speed * dt

      if (s.keys.left) s.targetX -= 420 * dt
      if (s.keys.right) s.targetX += 420 * dt
      s.targetX = Math.max(60, Math.min(GAME_W - 60, s.targetX))
      s.x += (s.targetX - s.x) * Math.min(1, dt * 9)

      // Spawn a new row of scenery every so often.
      while (s.nextRow < s.distance + GAME_H) {
        const row = s.nextRow
        const gapCentre = 120 + rnd(row * 0.31) * (GAME_W - 240)
        const count = 2 + Math.floor(rnd(row * 0.77) * 3)
        for (let i = 0; i < count; i++) {
          const x = 40 + rnd(row * 1.3 + i * 5.7) * (GAME_W - 80)
          if (Math.abs(x - gapCentre) < 90) continue
          s.obstacles.push({
            x,
            y: row,
            kind: rnd(row * 2.9 + i) > 0.45 ? 'tree' : 'rock',
          })
        }
        if (rnd(row * 4.1) > 0.45) {
          s.obstacles.push({ x: gapCentre, y: row + 40, kind: 'coin' })
        }
        s.nextRow += 150
      }

      // Collisions, in screen space.
      const py = SLED_Y
      for (const o of s.obstacles) {
        const oy = o.y - s.distance + GAME_H
        if (oy < py - 60 || oy > py + 40) continue
        const dx = Math.abs(o.x - s.x)
        if (o.kind === 'coin') {
          if (!o.taken && dx < 30 && Math.abs(oy - py) < 34) {
            o.taken = true
            s.picked += 1
          }
        } else if (dx < 26 && Math.abs(oy - py + 8) < 26) {
          s.dead = true
        }
      }
      s.obstacles = s.obstacles.filter((o) => o.y - s.distance + GAME_H > -80)

      const running = Math.floor(s.distance / 14) + s.picked * 6

      // --- draw -------------------------------------------------------------
      ctx.fillStyle = '#eef7ff'
      ctx.fillRect(0, 0, GAME_W, GAME_H)

      // Speed lines in the snow.
      ctx.strokeStyle = withAlpha('#b9d4ea', 0.8)
      ctx.lineWidth = 3
      for (let i = 0; i < 26; i++) {
        const lx = rnd(i * 3.3) * GAME_W
        const ly = (rnd(i * 8.1) * GAME_H + s.scroll * 1.2) % GAME_H
        ctx.beginPath()
        ctx.moveTo(lx, ly)
        ctx.lineTo(lx, ly + 26)
        ctx.stroke()
      }
      // Banked edges.
      const edge = ctx.createLinearGradient(0, 0, GAME_W, 0)
      edge.addColorStop(0, withAlpha('#a9c9e4', 0.9))
      edge.addColorStop(0.08, withAlpha('#a9c9e4', 0))
      edge.addColorStop(0.92, withAlpha('#a9c9e4', 0))
      edge.addColorStop(1, withAlpha('#a9c9e4', 0.9))
      ctx.fillStyle = edge
      ctx.fillRect(0, 0, GAME_W, GAME_H)

      for (const o of s.obstacles) {
        const oy = o.y - s.distance + GAME_H
        if (oy < -60 || oy > GAME_H + 60) continue
        if (o.kind === 'coin') {
          if (o.taken) continue
          const wob = Math.cos(now / 220 + o.x)
          ctx.fillStyle = '#f3c73f'
          ctx.beginPath()
          ctx.ellipse(o.x, oy, 11 * Math.abs(wob) + 2, 11, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#d9a91f'
          ctx.beginPath()
          ctx.ellipse(o.x, oy, 6 * Math.abs(wob) + 1, 6, 0, 0, Math.PI * 2)
          ctx.fill()
        } else if (o.kind === 'tree') {
          ctx.fillStyle = withAlpha('#0b1b33', 0.13)
          ctx.beginPath()
          ctx.ellipse(o.x, oy + 4, 22, 7, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#6b4a30'
          ctx.fillRect(o.x - 4, oy - 14, 8, 18)
          ctx.fillStyle = '#2f6b48'
          ctx.beginPath()
          ctx.moveTo(o.x, oy - 62)
          ctx.lineTo(o.x + 24, oy - 12)
          ctx.lineTo(o.x - 24, oy - 12)
          ctx.closePath()
          ctx.fill()
          ctx.fillStyle = withAlpha('#ffffff', 0.85)
          ctx.beginPath()
          ctx.moveTo(o.x, oy - 62)
          ctx.lineTo(o.x + 9, oy - 38)
          ctx.quadraticCurveTo(o.x, oy - 44, o.x - 9, oy - 38)
          ctx.closePath()
          ctx.fill()
        } else {
          ctx.fillStyle = withAlpha('#0b1b33', 0.13)
          ctx.beginPath()
          ctx.ellipse(o.x, oy + 4, 20, 6, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#8794a4'
          ctx.beginPath()
          ctx.ellipse(o.x, oy - 8, 20, 15, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#ffffff'
          ctx.beginPath()
          ctx.ellipse(o.x - 2, oy - 16, 14, 7, -0.2, Math.PI, 0)
          ctx.fill()
        }
      }

      // Sled + rider.
      const tilt = (s.targetX - s.x) * 0.004
      ctx.save()
      ctx.translate(s.x, SLED_Y)
      ctx.rotate(tilt)
      ctx.fillStyle = withAlpha('#0b1b33', 0.15)
      ctx.beginPath()
      ctx.ellipse(0, 10, 34, 9, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.scale(0.85, 0.85)
      drawPenguin(
        ctx,
        {
          id: 'me',
          username: '',
          color: look.color,
          equipped: look.equipped,
          x: 0,
          y: -6,
          tx: 0,
          ty: -6,
          dir: 1,
          emote: null,
          emoteAt: 0,
          bubble: null,
          bubbleAt: 0,
        } as PlayerState,
        now,
        { showName: false },
      )
      ctx.fillStyle = '#c0392b'
      ctx.beginPath()
      ctx.roundRect(-32, -8, 64, 16, 6)
      ctx.fill()
      ctx.strokeStyle = '#8a6038'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(-34, 10)
      ctx.lineTo(34, 10)
      ctx.stroke()
      ctx.restore()

      // Snow spray behind the sled.
      ctx.fillStyle = withAlpha('#ffffff', 0.8)
      for (let i = 0; i < 8; i++) {
        const a = rnd(i * 2.2 + Math.floor(now / 90)) * Math.PI
        const r = 12 + rnd(i * 7.4 + Math.floor(now / 90)) * 26
        ctx.beginPath()
        ctx.arc(s.x - Math.cos(a) * r, SLED_Y + 12 + Math.sin(a) * r * 0.4, 3, 0, Math.PI * 2)
        ctx.fill()
      }

      // HUD.
      ctx.font = '700 22px ui-rounded, "Segoe UI", system-ui, sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillStyle = withAlpha('#0d1f38', 0.55)
      ctx.beginPath()
      ctx.roundRect(14, 14, 190, 38, 10)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.fillText(`${Math.floor(s.distance / 10)} m`, 26, 22)
      ctx.fillStyle = '#f3c73f'
      ctx.textAlign = 'right'
      ctx.fillText(`◎ ${s.picked}`, 194, 22)

      if (s.dead) {
        void finish(running)
        return
      }
      setScore(running)
      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      canvas.removeEventListener('pointermove', onMove)
    }
  }, [phase, look, finish])

  return (
    <GameFrame
      title="Sled Rush"
      howTo="Steer with the mouse or ← →. Dodge the trees and rocks, scoop up the coins, and see how far down the hill you get."
      phase={phase}
      score={score}
      coinsAwarded={coinsAwarded}
      awardError={awardError}
      onStart={start}
      onExit={onExit}
    >
      <canvas ref={canvasRef} className="game-canvas" />
    </GameFrame>
  )
}
