import { mix, shade, withAlpha } from './palette'
import { WORLD_H, WORLD_W } from './render'

/** Deterministic pseudo-random in [0,1) so scenery never flickers between frames. */
export function rnd(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

export function sky(ctx: CanvasRenderingContext2D, top: string, bottom: string) {
  const g = ctx.createLinearGradient(0, 0, 0, WORLD_H * 0.72)
  g.addColorStop(0, top)
  g.addColorStop(1, bottom)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, WORLD_W, WORLD_H)
}

export function stars(ctx: CanvasRenderingContext2D, t: number, count = 60, maxY = 380) {
  for (let i = 0; i < count; i++) {
    const x = rnd(i * 3.1) * WORLD_W
    const y = rnd(i * 7.7) * maxY
    const tw = 0.45 + Math.sin(t * 1.6 + i) * 0.35
    ctx.fillStyle = withAlpha('#ffffff', tw)
    ctx.fillRect(x, y, 2, 2)
  }
}

export function moon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = withAlpha('#e8f1ff', 0.16)
  ctx.beginPath()
  ctx.arc(x, y, r * 2.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f2f7ff'
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = withAlpha('#c9d9ec', 0.55)
  ctx.beginPath()
  ctx.arc(x - r * 0.3, y - r * 0.25, r * 0.16, 0, Math.PI * 2)
  ctx.arc(x + r * 0.35, y + r * 0.2, r * 0.12, 0, Math.PI * 2)
  ctx.arc(x + r * 0.05, y + r * 0.45, r * 0.09, 0, Math.PI * 2)
  ctx.fill()
}

/** A jagged mountain silhouette. */
export function mountains(
  ctx: CanvasRenderingContext2D,
  baseY: number,
  height: number,
  color: string,
  seed: number,
  peaks = 7,
) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(-40, baseY)
  const step = (WORLD_W + 80) / peaks
  for (let i = 0; i <= peaks; i++) {
    const x = -40 + i * step
    const h = height * (0.55 + rnd(seed + i) * 0.65)
    ctx.lineTo(x - step * 0.5, baseY - h * 0.35)
    ctx.lineTo(x, baseY - h)
  }
  ctx.lineTo(WORLD_W + 40, baseY)
  ctx.closePath()
  ctx.fill()

  // Snow caps.
  ctx.fillStyle = withAlpha('#ffffff', 0.75)
  for (let i = 0; i <= peaks; i++) {
    const x = -40 + i * step
    const h = height * (0.55 + rnd(seed + i) * 0.65)
    ctx.beginPath()
    ctx.moveTo(x, baseY - h)
    ctx.lineTo(x - h * 0.13, baseY - h * 0.82)
    ctx.lineTo(x - h * 0.05, baseY - h * 0.86)
    ctx.lineTo(x + h * 0.06, baseY - h * 0.8)
    ctx.lineTo(x + h * 0.14, baseY - h * 0.84)
    ctx.closePath()
    ctx.fill()
  }
}

/** Rolling snow ground with a soft horizon lip. */
export function snowGround(ctx: CanvasRenderingContext2D, y: number, tint = '#eaf4fd') {
  const g = ctx.createLinearGradient(0, y - 30, 0, WORLD_H)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.35, tint)
  g.addColorStop(1, shade(tint, -0.12))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(0, y + 20)
  ctx.quadraticCurveTo(WORLD_W * 0.25, y - 22, WORLD_W * 0.55, y + 4)
  ctx.quadraticCurveTo(WORLD_W * 0.82, y + 24, WORLD_W, y - 6)
  ctx.lineTo(WORLD_W, WORLD_H)
  ctx.lineTo(0, WORLD_H)
  ctx.closePath()
  ctx.fill()
}

export function snowMound(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, Math.PI, 0)
  ctx.fill()
  ctx.fillStyle = withAlpha('#c5daf0', 0.5)
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry * 0.28, 0, Math.PI, 0)
  ctx.fill()
}

export function pineTree(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = '#6b4a30'
  ctx.fillRect(x - 4 * s, y - 16 * s, 8 * s, 18 * s)
  for (let i = 0; i < 3; i++) {
    const ty = y - 16 * s - i * 22 * s
    const w = (36 - i * 8) * s
    ctx.fillStyle = mix('#2f6b48', '#3f8a5c', i / 3)
    ctx.beginPath()
    ctx.moveTo(x, ty - 34 * s)
    ctx.lineTo(x + w / 2, ty)
    ctx.lineTo(x - w / 2, ty)
    ctx.closePath()
    ctx.fill()
    // Snow on the branches.
    ctx.fillStyle = withAlpha('#ffffff', 0.9)
    ctx.beginPath()
    ctx.moveTo(x, ty - 34 * s)
    ctx.lineTo(x + w * 0.28, ty - 12 * s)
    ctx.quadraticCurveTo(x, ty - 18 * s, x - w * 0.28, ty - 12 * s)
    ctx.closePath()
    ctx.fill()
  }
}

export interface BuildingOpts {
  x: number
  y: number
  w: number
  h: number
  wall: string
  roof: string
  label?: string
  labelColor?: string
  /** Lit windows glow at night. */
  lit?: boolean
  windows?: number
}

/** A cosy little snow-capped shopfront. */
export function building(ctx: CanvasRenderingContext2D, o: BuildingOpts) {
  const { x, y, w, h } = o
  // Walls.
  const g = ctx.createLinearGradient(x, y - h, x, y)
  g.addColorStop(0, shade(o.wall, 0.08))
  g.addColorStop(1, shade(o.wall, -0.14))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.roundRect(x - w / 2, y - h, w, h, 6)
  ctx.fill()

  // Roof.
  ctx.fillStyle = o.roof
  ctx.beginPath()
  ctx.moveTo(x - w / 2 - 16, y - h + 6)
  ctx.lineTo(x, y - h - 52)
  ctx.lineTo(x + w / 2 + 16, y - h + 6)
  ctx.closePath()
  ctx.fill()
  // Snow on the roof.
  ctx.fillStyle = '#f7fbff'
  ctx.beginPath()
  ctx.moveTo(x - w / 2 - 16, y - h + 6)
  ctx.lineTo(x, y - h - 52)
  ctx.lineTo(x + w / 2 + 16, y - h + 6)
  ctx.lineTo(x + w / 2 + 4, y - h + 6)
  ctx.quadraticCurveTo(x + w * 0.18, y - h - 22, x, y - h - 40)
  ctx.quadraticCurveTo(x - w * 0.18, y - h - 22, x - w / 2 - 4, y - h + 6)
  ctx.closePath()
  ctx.fill()

  // Door.
  const doorW = Math.min(64, w * 0.34)
  const doorH = Math.min(84, h * 0.66)
  ctx.fillStyle = '#4a352a'
  ctx.beginPath()
  ctx.roundRect(x - doorW / 2, y - doorH, doorW, doorH, [8, 8, 0, 0])
  ctx.fill()
  ctx.fillStyle = withAlpha('#ffe9a8', o.lit ? 0.55 : 0.18)
  ctx.beginPath()
  ctx.roundRect(x - doorW / 2 + 5, y - doorH + 6, doorW - 10, doorH - 10, [6, 6, 0, 0])
  ctx.fill()
  ctx.fillStyle = '#f0c14b'
  ctx.beginPath()
  ctx.arc(x + doorW / 2 - 10, y - doorH / 2, 2.5, 0, Math.PI * 2)
  ctx.fill()

  // Windows.
  const count = o.windows ?? 2
  for (let i = 0; i < count; i++) {
    const wx = x - w / 2 + (w / (count + 1)) * (i + 1) + (i >= count / 2 ? doorW * 0.55 : -doorW * 0.55)
    const wy = y - h + 34
    ctx.fillStyle = '#f3f7fb'
    ctx.beginPath()
    ctx.roundRect(wx - 22, wy, 44, 36, 5)
    ctx.fill()
    ctx.fillStyle = o.lit ? '#ffd982' : '#a9cbe8'
    ctx.beginPath()
    ctx.roundRect(wx - 18, wy + 4, 36, 28, 3)
    ctx.fill()
    ctx.strokeStyle = '#f3f7fb'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(wx, wy + 4)
    ctx.lineTo(wx, wy + 32)
    ctx.moveTo(wx - 18, wy + 18)
    ctx.lineTo(wx + 18, wy + 18)
    ctx.stroke()
  }

  // Hanging sign.
  if (o.label) {
    const sy = y - h - 4
    ctx.font = '700 19px ui-rounded, "Segoe UI", system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const tw = ctx.measureText(o.label).width + 30
    ctx.fillStyle = o.labelColor ?? '#2c3e50'
    ctx.beginPath()
    ctx.roundRect(x - tw / 2, sy, tw, 30, 8)
    ctx.fill()
    ctx.fillStyle = withAlpha('#ffffff', 0.18)
    ctx.beginPath()
    ctx.roundRect(x - tw / 2 + 3, sy + 3, tw - 6, 11, 6)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.fillText(o.label, x, sy + 16)
  }
}

export function lamppost(ctx: CanvasRenderingContext2D, x: number, y: number, lit = false) {
  ctx.fillStyle = '#3c4a5c'
  ctx.fillRect(x - 3, y - 96, 6, 96)
  ctx.beginPath()
  ctx.ellipse(x, y, 12, 4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = lit ? '#ffe9a8' : '#dbe7f2'
  ctx.strokeStyle = '#3c4a5c'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(x - 11, y - 96)
  ctx.lineTo(x + 11, y - 96)
  ctx.lineTo(x + 6, y - 116)
  ctx.lineTo(x - 6, y - 116)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  if (lit) {
    ctx.fillStyle = withAlpha('#ffe9a8', 0.13)
    ctx.beginPath()
    ctx.arc(x, y - 100, 46, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.ellipse(x, y - 117, 9, 4, 0, Math.PI, 0)
  ctx.fill()
}

/** Animated open water, for the dock and beach. */
export function water(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
  top = '#4aa8d8',
  bottom = '#1d6ba3',
) {
  const g = ctx.createLinearGradient(0, y, 0, y + h)
  g.addColorStop(0, top)
  g.addColorStop(1, bottom)
  ctx.fillStyle = g
  ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = withAlpha('#ffffff', 0.35)
  ctx.lineWidth = 2
  for (let i = 0; i < 10; i++) {
    const wy = y + 12 + i * (h / 10)
    const phase = t * (0.6 + i * 0.05) + i
    ctx.beginPath()
    for (let wx = x; wx <= x + w; wx += 16) {
      const yy = wy + Math.sin(wx * 0.04 + phase) * 2.5
      if (wx === x) ctx.moveTo(wx, yy)
      else ctx.lineTo(wx, yy)
    }
    ctx.globalAlpha = 0.12 + (i % 3) * 0.06
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

/** Falling snow, drawn on top of everything. */
export function snowfall(ctx: CanvasRenderingContext2D, t: number, count = 70, alpha = 0.75) {
  ctx.fillStyle = withAlpha('#ffffff', alpha)
  for (let i = 0; i < count; i++) {
    const speed = 18 + rnd(i * 5.3) * 40
    const drift = Math.sin(t * 0.6 + i) * 26
    const x = (rnd(i * 1.7) * WORLD_W + drift + WORLD_W) % WORLD_W
    const y = (rnd(i * 9.1) * WORLD_H + t * speed) % WORLD_H
    const r = 1.4 + rnd(i * 2.9) * 2.2
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** Wooden interior floor. */
export function woodFloor(ctx: CanvasRenderingContext2D, y: number, base = '#a9743f') {
  const g = ctx.createLinearGradient(0, y, 0, WORLD_H)
  g.addColorStop(0, shade(base, -0.18))
  g.addColorStop(1, shade(base, 0.06))
  ctx.fillStyle = g
  ctx.fillRect(0, y, WORLD_W, WORLD_H - y)
  ctx.strokeStyle = withAlpha('#000000', 0.22)
  ctx.lineWidth = 2
  for (let i = 0; i < 14; i++) {
    const ly = y + 18 + i * 26
    ctx.beginPath()
    ctx.moveTo(0, ly)
    ctx.lineTo(WORLD_W, ly)
    ctx.stroke()
  }
  for (let i = 0; i < 26; i++) {
    const lx = rnd(i * 4.4) * WORLD_W
    const ly = y + 18 + Math.floor(rnd(i * 8.8) * 13) * 26
    ctx.beginPath()
    ctx.moveTo(lx, ly)
    ctx.lineTo(lx, ly + 26)
    ctx.stroke()
  }
}

export function interiorWall(ctx: CanvasRenderingContext2D, y: number, top: string, bottom: string) {
  const g = ctx.createLinearGradient(0, 0, 0, y)
  g.addColorStop(0, top)
  g.addColorStop(1, bottom)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, WORLD_W, y)

  // Wainscoting, so the wall doesn't read as open sky.
  const railY = y - 150
  ctx.fillStyle = withAlpha('#ffffff', 0.16)
  ctx.fillRect(0, railY, WORLD_W, y - railY)
  ctx.strokeStyle = withAlpha('#000000', 0.12)
  ctx.lineWidth = 2
  for (let x = 0; x <= WORLD_W; x += 64) {
    ctx.beginPath()
    ctx.moveTo(x, railY + 10)
    ctx.lineTo(x, y - 16)
    ctx.stroke()
  }
  ctx.fillStyle = withAlpha('#000000', 0.14)
  ctx.fillRect(0, railY, WORLD_W, 9)
  ctx.fillStyle = withAlpha('#ffffff', 0.28)
  ctx.fillRect(0, railY + 9, WORLD_W, 4)

  // Skirting board where wall meets floor.
  ctx.fillStyle = withAlpha('#000000', 0.22)
  ctx.fillRect(0, y - 16, WORLD_W, 16)
}

/** Pulsing dance floor tiles. */
export function danceFloor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number) {
  const cols = 8
  const rows = 5
  const cw = w / cols
  const ch = h / rows
  const hues = ['#ff5f7e', '#ffd166', '#4ade80', '#38bdf8', '#a78bfa']
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const phase = Math.sin(t * 2.4 + c * 0.7 + r * 0.9)
      const color = hues[(c + r + Math.floor(t * 1.6)) % hues.length]
      ctx.fillStyle = withAlpha(color, 0.35 + phase * 0.3)
      ctx.fillRect(x + c * cw, y + r * ch, cw - 2, ch - 2)
    }
  }
}

export function sign(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color = '#2c3e50') {
  ctx.font = '700 17px ui-rounded, "Segoe UI", system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const w = ctx.measureText(text).width + 26
  ctx.fillStyle = '#8a6a44'
  ctx.fillRect(x - 4, y, 8, 34)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(x - w / 2, y - 28, w, 30, 7)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.fillText(text, x, y - 13)
}
