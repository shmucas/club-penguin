import { useCallback, useEffect, useRef, useState } from 'react'
import type { Equipped, PlayerState } from '../../lib/types'
import { drawPenguin } from '../../game/render'
import { withAlpha } from '../../game/palette'
import { rnd } from '../../game/scenery'
import { GAME_H, GAME_W, GameFrame, type GamePhase, getCtx, pointerPos, useGameCanvas } from './GameFrame'

type Swimmer = 'fish' | 'bigfish' | 'jelly' | 'boot'

interface Creature {
  id: number
  kind: Swimmer
  x: number
  y: number
  vx: number
  wobble: number
  gone?: boolean
}

interface Props {
  look: { color: string; equipped: Equipped }
  onAward: (score: number) => Promise<number | null>
  onExit: () => void
}

const ICE_Y = 120
const ROUND_MS = 70000

const VALUE: Record<Swimmer, number> = { fish: 8, bigfish: 20, jelly: -12, boot: 0 }

export function IceFishing({ look, onAward, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useGameCanvas(canvasRef)

  const [phase, setPhase] = useState<GamePhase>('intro')
  const [score, setScore] = useState(0)
  const [coinsAwarded, setCoinsAwarded] = useState<number | null>(null)
  const [awardError, setAwardError] = useState<string | null>(null)

  const state = useRef({
    hookX: GAME_W / 2,
    hookY: 300,
    creatures: [] as Creature[],
    nextId: 1,
    spawnAt: 0,
    points: 0,
    caught: 0,
    startedAt: 0,
    flash: 0,
    flashText: '',
  })

  const start = useCallback(() => {
    state.current = {
      hookX: GAME_W / 2,
      hookY: 300,
      creatures: [],
      nextId: 1,
      spawnAt: 0,
      points: 0,
      caught: 0,
      startedAt: performance.now(),
      flash: 0,
      flashText: '',
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
      const p = pointerPos(canvas, e)
      state.current.hookX = Math.max(24, Math.min(GAME_W - 24, p.x))
      state.current.hookY = Math.max(ICE_Y + 40, Math.min(GAME_H - 30, p.y))
    }
    canvas.addEventListener('pointermove', onMove)

    let raf = 0
    let last = performance.now()

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const s = state.current
      const ctx = getCtx(canvas)
      if (!ctx) return

      const elapsed = now - s.startedAt
      const left = Math.max(0, ROUND_MS - elapsed)

      // --- update -----------------------------------------------------------
      if (now > s.spawnAt) {
        s.spawnAt = now + 420 + rnd(now) * 500
        const roll = rnd(now * 1.7)
        const kind: Swimmer = roll > 0.86 ? 'bigfish' : roll > 0.68 ? 'jelly' : roll > 0.62 ? 'boot' : 'fish'
        const fromLeft = rnd(now * 3.1) > 0.5
        const speed = (kind === 'bigfish' ? 60 : kind === 'jelly' ? 45 : 95) * (0.7 + rnd(now * 5.5) * 0.8)
        s.creatures.push({
          id: s.nextId++,
          kind,
          x: fromLeft ? -50 : GAME_W + 50,
          y: ICE_Y + 60 + rnd(now * 7.3) * (GAME_H - ICE_Y - 120),
          vx: fromLeft ? speed : -speed,
          wobble: rnd(now * 9.9) * 6,
        })
      }

      for (const c of s.creatures) {
        c.x += c.vx * dt
        c.y += Math.sin(now / 500 + c.wobble) * 14 * dt
        if (c.gone) continue
        const hitR = c.kind === 'bigfish' ? 34 : c.kind === 'jelly' ? 24 : 24
        if (Math.hypot(c.x - s.hookX, c.y - s.hookY) < hitR) {
          c.gone = true
          const value = VALUE[c.kind]
          s.points = Math.max(0, s.points + value)
          if (value > 0) s.caught += 1
          s.flash = now
          s.flashText = c.kind === 'jelly' ? 'Ouch! Jellyfish' : c.kind === 'boot' ? 'An old boot…' : `+${value}`
        }
      }
      s.creatures = s.creatures.filter((c) => !c.gone && c.x > -90 && c.x < GAME_W + 90)

      // --- draw -------------------------------------------------------------
      const water = ctx.createLinearGradient(0, ICE_Y, 0, GAME_H)
      water.addColorStop(0, '#4aa8d8')
      water.addColorStop(1, '#0e4a75')
      ctx.fillStyle = water
      ctx.fillRect(0, 0, GAME_W, GAME_H)

      // Shafts of light.
      for (let i = 0; i < 4; i++) {
        const x = 90 + i * 190 + Math.sin(now / 2600 + i) * 22
        const g = ctx.createLinearGradient(x, ICE_Y, x, GAME_H)
        g.addColorStop(0, withAlpha('#ffffff', 0.16))
        g.addColorStop(1, withAlpha('#ffffff', 0))
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.moveTo(x - 26, ICE_Y)
        ctx.lineTo(x + 26, ICE_Y)
        ctx.lineTo(x + 70, GAME_H)
        ctx.lineTo(x - 70, GAME_H)
        ctx.closePath()
        ctx.fill()
      }

      // Bubbles.
      ctx.fillStyle = withAlpha('#ffffff', 0.3)
      for (let i = 0; i < 22; i++) {
        const bx = rnd(i * 2.7) * GAME_W
        const by = GAME_H - ((rnd(i * 6.1) * GAME_H + now / 22) % (GAME_H - ICE_Y))
        ctx.beginPath()
        ctx.arc(bx, by, 2 + rnd(i * 4.3) * 3, 0, Math.PI * 2)
        ctx.fill()
      }

      // Creatures.
      for (const c of s.creatures) {
        const face = c.vx > 0 ? 1 : -1
        ctx.save()
        ctx.translate(c.x, c.y)
        ctx.scale(face, 1)
        if (c.kind === 'jelly') {
          const pulse = 1 + Math.sin(now / 260 + c.wobble) * 0.12
          ctx.fillStyle = withAlpha('#e08fd8', 0.85)
          ctx.beginPath()
          ctx.ellipse(0, 0, 20 * pulse, 16 * pulse, 0, Math.PI, 0)
          ctx.fill()
          ctx.strokeStyle = withAlpha('#e08fd8', 0.7)
          ctx.lineWidth = 3
          for (let i = -2; i <= 2; i++) {
            ctx.beginPath()
            ctx.moveTo(i * 7, 0)
            ctx.quadraticCurveTo(i * 7 + Math.sin(now / 300 + i) * 7, 16, i * 7, 30)
            ctx.stroke()
          }
        } else if (c.kind === 'boot') {
          ctx.fillStyle = '#5a4230'
          ctx.beginPath()
          ctx.roundRect(-8, -20, 18, 26, 4)
          ctx.fill()
          ctx.beginPath()
          ctx.roundRect(-22, 2, 32, 12, 5)
          ctx.fill()
        } else {
          const big = c.kind === 'bigfish'
          const r = big ? 1.7 : 1
          ctx.fillStyle = big ? '#f2a03d' : '#5fd0e0'
          ctx.beginPath()
          ctx.ellipse(0, 0, 22 * r, 13 * r, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.moveTo(-20 * r, 0)
          ctx.lineTo(-34 * r, -11 * r)
          ctx.lineTo(-34 * r, 11 * r)
          ctx.closePath()
          ctx.fill()
          ctx.fillStyle = withAlpha('#ffffff', 0.45)
          ctx.beginPath()
          ctx.ellipse(2 * r, -3 * r, 12 * r, 5 * r, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#ffffff'
          ctx.beginPath()
          ctx.arc(11 * r, -3 * r, 4 * r, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#1d2733'
          ctx.beginPath()
          ctx.arc(12 * r, -3 * r, 2 * r, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }

      // Ice shelf and the angler.
      ctx.fillStyle = '#dceefa'
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(GAME_W, 0)
      ctx.lineTo(GAME_W, ICE_Y - 10)
      ctx.quadraticCurveTo(GAME_W * 0.7, ICE_Y + 8, GAME_W * 0.42, ICE_Y - 6)
      ctx.quadraticCurveTo(GAME_W * 0.2, ICE_Y - 18, 0, ICE_Y - 4)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = withAlpha('#a9cbe8', 0.6)
      ctx.fillRect(0, 0, GAME_W, 16)

      const rodTipX = 250
      const rodTipY = ICE_Y - 30
      ctx.save()
      ctx.translate(170, ICE_Y - 12)
      ctx.scale(0.9, 0.9)
      drawPenguin(
        ctx,
        {
          id: 'me',
          username: '',
          color: look.color,
          equipped: { ...look.equipped, hand: 'hand_rod' },
          x: 0,
          y: 0,
          tx: 0,
          ty: 0,
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

      // Line and hook.
      ctx.strokeStyle = withAlpha('#ffffff', 0.85)
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(rodTipX, rodTipY)
      ctx.quadraticCurveTo((rodTipX + s.hookX) / 2, s.hookY * 0.6, s.hookX, s.hookY)
      ctx.stroke()
      ctx.strokeStyle = '#e6ecf2'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(s.hookX, s.hookY + 4, 7, Math.PI * 0.15, Math.PI * 1.1)
      ctx.stroke()
      ctx.fillStyle = '#f3c73f'
      ctx.beginPath()
      ctx.arc(s.hookX, s.hookY - 6, 5, 0, Math.PI * 2)
      ctx.fill()

      // HUD.
      ctx.font = '700 22px ui-rounded, "Segoe UI", system-ui, sans-serif'
      ctx.textBaseline = 'top'
      ctx.fillStyle = withAlpha('#0d1f38', 0.5)
      ctx.beginPath()
      ctx.roundRect(14, 14, 250, 38, 10)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'left'
      ctx.fillText(`🐟 ${s.caught}`, 26, 22)
      ctx.textAlign = 'right'
      ctx.fillStyle = left < 10000 ? '#ff9b9b' : '#ffffff'
      ctx.fillText(`${Math.ceil(left / 1000)}s`, 254, 22)

      if (now - s.flash < 900) {
        ctx.globalAlpha = 1 - (now - s.flash) / 900
        ctx.textAlign = 'center'
        ctx.font = '800 26px ui-rounded, "Segoe UI", system-ui, sans-serif'
        ctx.fillStyle = s.flashText.startsWith('+') ? '#9dffb0' : '#ffd0d0'
        ctx.fillText(s.flashText, s.hookX, s.hookY - 60 - (now - s.flash) / 20)
        ctx.globalAlpha = 1
      }

      if (left <= 0) {
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
    }
  }, [phase, look, finish])

  return (
    <GameFrame
      title="Ice Fishing"
      howTo="Move the hook with your mouse. Little fish are worth 8, the big orange ones 20. Dodge the jellyfish — they cost you points. You have 70 seconds."
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
