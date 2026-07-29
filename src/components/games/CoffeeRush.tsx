import { useCallback, useEffect, useRef, useState } from 'react'
import type { Equipped, PlayerState } from '../../lib/types'
import { drawPenguin } from '../../game/render'
import { withAlpha } from '../../game/palette'
import { rnd } from '../../game/scenery'
import { GAME_H, GAME_W, GameFrame, type GamePhase, getCtx, pointerPos, useGameCanvas } from './GameFrame'

type Falling = 'bag' | 'gold' | 'mug'

interface Drop {
  id: number
  kind: Falling
  x: number
  y: number
  vy: number
  spin: number
}

interface Props {
  look: { color: string; equipped: Equipped }
  onAward: (score: number) => Promise<number | null>
  onExit: () => void
}

const CART_Y = GAME_H - 96
const CART_W = 108

export function CoffeeRush({ look, onAward, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useGameCanvas(canvasRef)

  const [phase, setPhase] = useState<GamePhase>('intro')
  const [score, setScore] = useState(0)
  const [coinsAwarded, setCoinsAwarded] = useState<number | null>(null)
  const [awardError, setAwardError] = useState<string | null>(null)

  const state = useRef({
    cartX: GAME_W / 2,
    targetX: GAME_W / 2,
    drops: [] as Drop[],
    nextId: 1,
    spawnAt: 0,
    points: 0,
    lives: 3,
    level: 1,
    startedAt: 0,
    shake: 0,
  })

  const start = useCallback(() => {
    state.current = {
      cartX: GAME_W / 2,
      targetX: GAME_W / 2,
      drops: [],
      nextId: 1,
      spawnAt: 0,
      points: 0,
      lives: 3,
      level: 1,
      startedAt: performance.now(),
      shake: 0,
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
        setCoinsAwarded(await onAward(finalScore))
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

    const onMove = (e: PointerEvent) => {
      state.current.targetX = pointerPos(canvas, e).x
    }
    const keys = { left: false, right: false }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true
      if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false
      if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false
    }
    canvas.addEventListener('pointermove', onMove)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    let raf = 0
    let last = performance.now()

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const s = state.current
      const ctx = getCtx(canvas)
      if (!ctx) return

      // --- update -----------------------------------------------------------
      s.level = 1 + Math.floor((now - s.startedAt) / 14000)
      if (keys.left) s.targetX -= 480 * dt
      if (keys.right) s.targetX += 480 * dt
      s.targetX = Math.max(CART_W / 2, Math.min(GAME_W - CART_W / 2, s.targetX))
      s.cartX += (s.targetX - s.cartX) * Math.min(1, dt * 11)

      if (now > s.spawnAt) {
        s.spawnAt = now + Math.max(280, 900 - s.level * 90) * (0.6 + rnd(now) * 0.8)
        const roll = rnd(now * 2.3)
        const kind: Falling = roll > 0.9 ? 'gold' : roll > 0.76 ? 'mug' : 'bag'
        s.drops.push({
          id: s.nextId++,
          kind,
          x: 50 + rnd(now * 4.7) * (GAME_W - 100),
          y: -40,
          vy: 150 + s.level * 26 + rnd(now * 6.1) * 70,
          spin: rnd(now * 8.3) * Math.PI,
        })
      }

      for (const d of s.drops) {
        d.y += d.vy * dt
        d.spin += dt * 2
        const caught = d.y > CART_Y - 20 && d.y < CART_Y + 30 && Math.abs(d.x - s.cartX) < CART_W / 2
        if (caught) {
          d.y = GAME_H + 999
          if (d.kind === 'mug') {
            s.lives -= 1
            s.shake = now
          } else {
            s.points += d.kind === 'gold' ? 18 : 5
          }
        } else if (d.y > GAME_H + 30) {
          if (d.kind !== 'mug') {
            s.lives -= 1
            s.shake = now
          }
        }
      }
      s.drops = s.drops.filter((d) => d.y < GAME_H + 40)

      // --- draw -------------------------------------------------------------
      const shake = now - s.shake < 260 ? Math.sin((now - s.shake) / 18) * 5 * (1 - (now - s.shake) / 260) : 0
      ctx.save()
      ctx.translate(shake, 0)

      const wall = ctx.createLinearGradient(0, 0, 0, GAME_H)
      wall.addColorStop(0, '#e6c9a4')
      wall.addColorStop(1, '#c08f5e')
      ctx.fillStyle = wall
      ctx.fillRect(-10, 0, GAME_W + 20, GAME_H)

      // Chute the bags fall from.
      ctx.fillStyle = '#7a4a28'
      ctx.fillRect(-10, 0, GAME_W + 20, 42)
      ctx.fillStyle = '#5f3a1f'
      for (let i = 0; i < 9; i++) ctx.fillRect(i * 90 + 20, 42, 46, 12)

      // Floor.
      ctx.fillStyle = '#8f5f37'
      ctx.fillRect(-10, GAME_H - 54, GAME_W + 20, 60)
      ctx.strokeStyle = withAlpha('#000000', 0.14)
      ctx.lineWidth = 2
      for (let i = 0; i < 10; i++) {
        ctx.beginPath()
        ctx.moveTo(i * 84, GAME_H - 54)
        ctx.lineTo(i * 84, GAME_H)
        ctx.stroke()
      }

      for (const d of s.drops) {
        ctx.save()
        ctx.translate(d.x, d.y)
        ctx.rotate(Math.sin(d.spin) * 0.25)
        if (d.kind === 'mug') {
          ctx.fillStyle = '#f4f7f9'
          ctx.beginPath()
          ctx.roundRect(-16, -16, 32, 30, 5)
          ctx.fill()
          ctx.strokeStyle = '#f4f7f9'
          ctx.lineWidth = 5
          ctx.beginPath()
          ctx.arc(20, -2, 9, -Math.PI / 2, Math.PI / 2)
          ctx.stroke()
          ctx.fillStyle = '#4a2c15'
          ctx.beginPath()
          ctx.ellipse(0, -14, 14, 5, 0, 0, Math.PI * 2)
          ctx.fill()
        } else {
          const gold = d.kind === 'gold'
          ctx.fillStyle = gold ? '#e8b53f' : '#b6884f'
          ctx.beginPath()
          ctx.roundRect(-20, -18, 40, 38, 6)
          ctx.fill()
          ctx.fillStyle = gold ? '#c9932a' : '#8f6738'
          ctx.beginPath()
          ctx.roundRect(-20, -18, 40, 9, [6, 6, 0, 0])
          ctx.fill()
          ctx.fillStyle = gold ? '#fff3c9' : '#e8dcc6'
          ctx.beginPath()
          ctx.ellipse(0, 4, 9, 11, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = gold ? '#c9932a' : '#8f6738'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(0, -6)
          ctx.lineTo(0, 14)
          ctx.stroke()
        }
        ctx.restore()
      }

      // Cart + penguin pushing it.
      ctx.save()
      ctx.translate(s.cartX, CART_Y)
      ctx.scale(0.8, 0.8)
      drawPenguin(
        ctx,
        {
          id: 'me',
          username: '',
          color: look.color,
          equipped: look.equipped,
          x: -46,
          y: 46,
          tx: -46,
          ty: 46,
          dir: 1,
          emote: null,
          emoteAt: 0,
          bubble: null,
          bubbleAt: 0,
        } as PlayerState,
        now,
        { showName: false },
      )
      ctx.restore()

      ctx.save()
      ctx.translate(s.cartX, CART_Y)
      ctx.fillStyle = '#c0392b'
      ctx.beginPath()
      ctx.moveTo(-CART_W / 2, 0)
      ctx.lineTo(CART_W / 2, 0)
      ctx.lineTo(CART_W / 2 - 12, 40)
      ctx.lineTo(-CART_W / 2 + 12, 40)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#8e2b20'
      ctx.fillRect(-CART_W / 2, 0, CART_W, 7)
      ctx.fillStyle = '#3c4a5c'
      for (const wx of [-CART_W / 2 + 22, CART_W / 2 - 22]) {
        ctx.beginPath()
        ctx.arc(wx, 44, 11, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#8794a4'
        ctx.beginPath()
        ctx.arc(wx, 44, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#3c4a5c'
      }
      ctx.restore()

      // HUD.
      ctx.font = '700 22px ui-rounded, "Segoe UI", system-ui, sans-serif'
      ctx.textBaseline = 'top'
      ctx.fillStyle = withAlpha('#0d1f38', 0.5)
      ctx.beginPath()
      ctx.roundRect(14, 66, 220, 38, 10)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'left'
      ctx.fillText(`Level ${s.level}`, 26, 74)
      ctx.textAlign = 'right'
      ctx.fillText('♥'.repeat(Math.max(0, s.lives)), 224, 74)

      ctx.restore()

      if (s.lives <= 0) {
        void finish(s.points)
        return
      }
      setScore(s.points)
      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('pointermove', onMove)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [phase, look, finish])

  return (
    <GameFrame
      title="Coffee Rush"
      howTo="Push the cart with your mouse or ← →. Catch every sack of beans — gold ones are worth triple. Drop three and you're done, and watch out for the hot mugs."
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
