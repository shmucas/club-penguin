import { mix, shade, withAlpha } from './palette'

/** Puffle body colours, keyed by the item id that unlocks them. */
export const PUFFLE_COLORS: Record<string, string> = {
  puffle_blue: '#3f9ee0',
  puffle_pink: '#f28cc0',
  puffle_green: '#4fbf72',
  puffle_purple: '#9b6fdc',
  puffle_red: '#e2504c',
  puffle_yellow: '#f0cc3f',
  puffle_orange: '#f0913a',
  puffle_white: '#f2f7fb',
  puffle_black: '#3a4250',
  puffle_rainbow: '#ff7ab0',
}

export const PUFFLE_IDS = Object.keys(PUFFLE_COLORS)

export function puffleColor(id: string): string {
  return PUFFLE_COLORS[id] ?? PUFFLE_COLORS.puffle_pink
}

/**
 * Draws a puffle: a round ball of fur with a tuft on top. `bounce` is 0..1
 * through a hop, `dir` is which way it faces.
 */
export function drawPuffle(
  ctx: CanvasRenderingContext2D,
  id: string,
  x: number,
  y: number,
  t: number,
  bounce = 0,
  dir: 1 | -1 = 1,
  scale = 1,
) {
  const rainbow = id === 'puffle_rainbow'
  const base = puffleColor(id)
  const r = 17 * scale

  ctx.save()
  ctx.translate(x, y)

  // Shadow squashes as the puffle hops.
  ctx.fillStyle = withAlpha('#0b1b33', 0.18 - bounce * 0.08)
  ctx.beginPath()
  ctx.ellipse(0, -1, r * (0.85 - bounce * 0.15), r * 0.28, 0, 0, Math.PI * 2)
  ctx.fill()

  const hop = bounce * 16 * scale
  ctx.translate(0, -r - hop)
  ctx.scale(dir, 1)
  // Squash and stretch through the hop.
  const squash = 1 + bounce * 0.12
  ctx.scale(1 / squash, squash)

  // Body.
  if (rainbow) {
    const g = ctx.createLinearGradient(-r, -r, r, r)
    g.addColorStop(0, '#ff7ab0')
    g.addColorStop(0.3, '#ffd166')
    g.addColorStop(0.6, '#4ade80')
    g.addColorStop(1, '#63b3ff')
    ctx.fillStyle = g
  } else {
    ctx.fillStyle = base
  }
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()

  // Fluffy underside.
  ctx.fillStyle = withAlpha(shade(base, -0.2), rainbow ? 0.18 : 0.5)
  ctx.beginPath()
  ctx.ellipse(0, r * 0.42, r * 0.78, r * 0.42, 0, 0, Math.PI * 2)
  ctx.fill()

  // Tuft of hair, waving gently.
  const wave = Math.sin(t * 3) * 0.18
  ctx.fillStyle = rainbow ? '#ff5f9e' : shade(base, -0.12)
  ctx.save()
  ctx.translate(-r * 0.15, -r * 0.85)
  ctx.rotate(wave)
  ctx.beginPath()
  ctx.moveTo(0, 6)
  ctx.quadraticCurveTo(-r * 0.7, -r * 0.5, -r * 0.15, -r * 0.75)
  ctx.quadraticCurveTo(r * 0.15, -r * 0.3, r * 0.5, -r * 0.55)
  ctx.quadraticCurveTo(r * 0.55, 0, 0, 6)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  // Eyes.
  const blink = Math.sin(t * 1.3 + x * 0.05) > 0.97
  for (const s of [-1, 1] as const) {
    const ex = s * r * 0.32 + r * 0.1
    if (blink) {
      ctx.strokeStyle = '#1d2733'
      ctx.lineWidth = 1.4 * scale
      ctx.beginPath()
      ctx.moveTo(ex - 3 * scale, -r * 0.12)
      ctx.lineTo(ex + 3 * scale, -r * 0.12)
      ctx.stroke()
    } else {
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.ellipse(ex, -r * 0.15, r * 0.24, r * 0.3, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#1d2733'
      ctx.beginPath()
      ctx.arc(ex + r * 0.06, -r * 0.1, r * 0.13, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = withAlpha('#ffffff', 0.9)
      ctx.beginPath()
      ctx.arc(ex + r * 0.02, -r * 0.2, r * 0.05, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Little smile.
  ctx.strokeStyle = withAlpha('#1d2733', 0.65)
  ctx.lineWidth = 1.6 * scale
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(r * 0.16, r * 0.16, r * 0.26, 0.15, Math.PI - 0.5)
  ctx.stroke()
  ctx.lineCap = 'butt'

  ctx.restore()
}

/** Draws a puffle centred in a preview canvas (shop tiles, player cards). */
export function drawPufflePreview(canvas: HTMLCanvasElement, id: string, now: number, scale = 1.6) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = canvas.clientWidth || 100
  const h = canvas.clientHeight || 100
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  const t = now / 1000
  const bounce = Math.max(0, Math.sin(t * 3.2))
  drawPuffle(ctx, id, w / 2, h - 12, t, bounce * 0.5, 1, scale)
}

export const PUFFLE_MOODS = [
  'is bouncing happily',
  'wants a snack',
  'is very pleased with you',
  'is showing off',
  'is ready for adventure',
]

/** Deterministic per-puffle flavour text for the player card. */
export function puffleMood(id: string, seed: string): string {
  let hash = 0
  for (const ch of id + seed) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return PUFFLE_MOODS[Math.abs(hash) % PUFFLE_MOODS.length]
}

export function pufflePreviewSwatch(id: string): string {
  return id === 'puffle_rainbow' ? mix('#ff7ab0', '#63b3ff', 0.5) : puffleColor(id)
}
