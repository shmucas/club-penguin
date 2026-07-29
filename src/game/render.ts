import type { PlayerState, Snowball } from '../lib/types'
import { ITEMS_BY_ID, P } from './items'
import { bodyColor, shade, withAlpha } from './palette'
import { drawPuffle } from './puffles'

export const WORLD_W = 1280
export const WORLD_H = 720

/** How fast a penguin waddles, in world pixels per second. */
export const WALK_SPEED = 190

export const BUBBLE_MS = 5200
export const EMOTE_MS = 2600

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2)
}

function drawFlipper(ctx: CanvasRenderingContext2D, side: -1 | 1, angle: number, fill: string) {
  ctx.save()
  ctx.translate(side * (P.flipperX - 3), P.flipperY)
  ctx.rotate(side * angle)
  ctx.fillStyle = fill
  ellipse(ctx, side * 3, 9, 6, 13)
  ctx.fill()
  ctx.restore()
}

function drawFoot(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#f0a028'
  ellipse(ctx, x, y, 7.5, 4)
  ctx.fill()
  ctx.fillStyle = '#d8871a'
  ellipse(ctx, x, y + 1.5, 7.5, 2.2)
  ctx.fill()
}

/**
 * Draws one penguin. The canvas is expected to be in world coordinates;
 * (p.x, p.y) is where the feet touch the ground.
 */
export function drawPenguin(
  ctx: CanvasRenderingContext2D,
  p: PlayerState,
  now: number,
  opts: { self?: boolean; showName?: boolean } = {},
) {
  const t = now / 1000
  const dx = p.tx - p.x
  const dy = p.ty - p.y
  const walking = Math.hypot(dx, dy) > 1.5
  const emote = p.emote && now - p.emoteAt < EMOTE_MS ? p.emote : null

  const body = bodyColor(p.color)
  const bodyDark = shade(body, -0.22)
  const belly = shade(body, 0.66)

  const dancing = emote === 'dance'
  const waving = emote === 'wave'
  const sitting = emote === 'sit'

  const step = walking ? Math.sin(t * 11) : 0
  const bob = dancing ? Math.abs(Math.sin(t * 7)) * 5 : walking ? Math.abs(Math.sin(t * 11)) * 2 : Math.sin(t * 1.6) * 0.8
  const lean = dancing ? Math.sin(t * 7) * 0.13 : 0

  ctx.save()
  ctx.translate(p.x, p.y)

  // Ground shadow (never flipped or bobbed).
  ctx.fillStyle = withAlpha('#0b1b33', 0.18)
  ellipse(ctx, 0, -1, 19, 6)
  ctx.fill()

  ctx.translate(0, -bob + (sitting ? 10 : 0))
  ctx.rotate(lean)
  ctx.scale(p.dir, 1)

  const d = { body, t }
  const item = (id?: string) => (id ? ITEMS_BY_ID[id] : undefined)
  const hat = item(p.equipped.hat)
  const shirt = item(p.equipped.shirt)
  const neck = item(p.equipped.neck)
  const hand = item(p.equipped.hand)
  const feet = item(p.equipped.feet)

  // Behind everything: capes.
  neck?.drawBack?.(ctx, d)

  // Feet.
  if (!sitting) {
    drawFoot(ctx, -P.footX + step * 3, P.footY)
    drawFoot(ctx, P.footX - step * 3, P.footY)
    feet?.draw?.(ctx, d)
  }

  // Back flipper.
  const backAngle = dancing ? -0.9 + Math.sin(t * 7) * 0.5 : walking ? step * 0.45 : 0.05
  drawFlipper(ctx, -1, backAngle, bodyDark)

  // Body.
  ctx.fillStyle = body
  ellipse(ctx, P.bodyCx, P.bodyCy, P.bodyRx, P.bodyRy)
  ctx.fill()

  // Belly.
  ctx.fillStyle = belly
  ellipse(ctx, P.bodyCx, P.bodyCy + 2, P.bodyRx - 7, P.bodyRy - 8)
  ctx.fill()

  shirt?.draw?.(ctx, d)

  // Head sits on top of the body as one continuous blob.
  ctx.fillStyle = body
  ellipse(ctx, P.headCx, P.headCy, P.headR, P.headR)
  ctx.fill()

  neck?.draw?.(ctx, d)

  // Beak.
  ctx.fillStyle = '#f0a028'
  ctx.beginPath()
  ctx.moveTo(2, P.beakY - 4)
  ctx.quadraticCurveTo(15, P.beakY, 2, P.beakY + 5)
  ctx.quadraticCurveTo(-2, P.beakY + 0.5, 2, P.beakY - 4)
  ctx.fill()
  ctx.fillStyle = '#d8871a'
  ctx.beginPath()
  ctx.moveTo(2, P.beakY + 0.5)
  ctx.quadraticCurveTo(10, P.beakY + 1.6, 2, P.beakY + 5)
  ctx.fill()

  // Eyes.
  const blink = Math.sin(t * 0.9 + p.x * 0.03) > 0.985
  for (const s of [-1, 1] as const) {
    const ex = s === -1 ? -P.eyeX + 1 : P.eyeX + 2
    ctx.fillStyle = '#ffffff'
    if (blink) {
      ctx.strokeStyle = '#1d2733'
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(ex - 3, P.eyeY)
      ctx.lineTo(ex + 3, P.eyeY)
      ctx.stroke()
    } else {
      ellipse(ctx, ex, P.eyeY, 4, 4.8)
      ctx.fill()
      ctx.fillStyle = '#1d2733'
      ellipse(ctx, ex + 1.2, P.eyeY + 0.4, 2.1, 2.4)
      ctx.fill()
      ctx.fillStyle = withAlpha('#ffffff', 0.9)
      ellipse(ctx, ex + 0.4, P.eyeY - 1.2, 0.8, 0.9)
      ctx.fill()
    }
  }

  hat?.draw?.(ctx, d)

  // Front flipper — the expressive one.
  const frontAngle = waving
    ? -2.0 + Math.sin(t * 12) * 0.35
    : dancing
      ? -0.9 - Math.sin(t * 7) * 0.5
      : walking
        ? -step * 0.45
        : -0.05
  drawFlipper(ctx, 1, frontAngle, bodyDark)

  if (!waving) hand?.draw?.(ctx, d)

  ctx.restore()

  if (opts.showName !== false) {
    drawNameTag(ctx, p, opts.self === true)
  }
}

function drawNameTag(ctx: CanvasRenderingContext2D, p: PlayerState, self: boolean) {
  ctx.save()
  ctx.font = '600 13px ui-rounded, "Segoe UI", system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const w = ctx.measureText(p.username).width + 14
  const y = p.y + 12
  ctx.fillStyle = self ? withAlpha('#1c6fd0', 0.92) : withAlpha('#0d1f38', 0.68)
  ctx.beginPath()
  ctx.roundRect(p.x - w / 2, y - 9, w, 18, 9)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.fillText(p.username, p.x, y)
  ctx.restore()
}

/** Draws the puffle trailing after a penguin, if it has one out. */
export function drawPlayerPuffle(ctx: CanvasRenderingContext2D, p: PlayerState, now: number) {
  const id = p.equipped.puffle
  if (!id) return
  const dir: 1 | -1 = p.x >= p.puffleX ? 1 : -1
  drawPuffle(ctx, id, p.puffleX, p.puffleY, now / 1000, p.puffleHop, dir)
}

/** Speech bubbles are drawn in a second pass so they never sit behind a penguin. */
export function drawBubble(ctx: CanvasRenderingContext2D, p: PlayerState, now: number) {
  if (!p.bubble || now - p.bubbleAt > BUBBLE_MS) return
  const age = now - p.bubbleAt
  const pop = Math.min(1, age / 140)
  const fade = age > BUBBLE_MS - 500 ? (BUBBLE_MS - age) / 500 : 1

  ctx.save()
  ctx.globalAlpha = Math.max(0, fade)
  ctx.font = '500 15px ui-rounded, "Segoe UI", system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const words = p.bubble.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > 190 && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)

  const lineH = 19
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 24
  const h = lines.length * lineH + 14
  const bx = p.x
  const by = p.y - 92 - h / 2

  ctx.translate(bx, by + h / 2)
  ctx.scale(pop, pop)
  ctx.translate(-bx, -(by + h / 2))

  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = withAlpha('#0d1f38', 0.14)
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(bx - w / 2, by, w, h, 11)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(bx - 7, by + h - 1)
  ctx.lineTo(bx, by + h + 10)
  ctx.lineTo(bx + 7, by + h - 1)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#20303f'
  lines.forEach((l, i) => {
    ctx.fillText(l, bx, by + 11 + i * lineH)
  })
  ctx.restore()
}

export const SNOWBALL_FLIGHT_MS = 620

export function drawSnowball(ctx: CanvasRenderingContext2D, s: Snowball, now: number) {
  const k = (now - s.start) / SNOWBALL_FLIGHT_MS
  if (k < 0 || k > 1) return
  const x = s.fromX + (s.toX - s.fromX) * k
  const y = s.fromY - 40 + (s.toY - (s.fromY - 40)) * k - Math.sin(k * Math.PI) * 70
  ctx.save()
  ctx.fillStyle = withAlpha('#0b1b33', 0.12)
  ellipse(ctx, s.fromX + (s.toX - s.fromX) * k, s.fromY + (s.toY - s.fromY) * k, 6 * (1 - k * 0.4), 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ellipse(ctx, x, y, 6, 6)
  ctx.fill()
  ctx.fillStyle = withAlpha('#c9dcf0', 0.9)
  ellipse(ctx, x + 1.5, y + 1.5, 3, 3)
  ctx.fill()
  ctx.restore()
}

/** Puff of snow when a snowball lands. */
export function drawSplat(ctx: CanvasRenderingContext2D, s: Snowball, now: number) {
  const age = now - s.start - SNOWBALL_FLIGHT_MS
  if (age < 0 || age > 380) return
  const k = age / 380
  ctx.save()
  ctx.globalAlpha = 1 - k
  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    const r = 6 + k * 20
    ellipse(ctx, s.toX + Math.cos(a) * r, s.toY - 6 + Math.sin(a) * r * 0.5, 3 * (1 - k) + 1, 3 * (1 - k) + 1)
    ctx.fill()
  }
  ctx.restore()
}

/**
 * Renders a single penguin centred in a small canvas — used for shop previews
 * and the penguin creator.
 */
export function drawPenguinPreview(
  canvas: HTMLCanvasElement,
  look: Pick<PlayerState, 'color' | 'equipped'>,
  now: number,
  scale = 1.6,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = canvas.clientWidth || 120
  const h = canvas.clientHeight || 140
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  ctx.save()
  ctx.translate(w / 2, h - 12)
  ctx.scale(scale, scale)
  drawPenguin(
    ctx,
    {
      id: 'preview',
      username: '',
      color: look.color,
      equipped: look.equipped,
      x: 0,
      y: 0,
      tx: 0,
      ty: 0,
      dir: 1,
      emote: null,
      emoteAt: 0,
      bubble: null,
      bubbleAt: 0,
      puffleX: 0,
      puffleY: 0,
      puffleHop: 0,
    },
    now,
    { showName: false },
  )
  ctx.restore()
}
