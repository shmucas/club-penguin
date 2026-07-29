/** Small colour helpers — everything in the game is drawn, so we mix shades in code. */

function clamp(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)))
}

function parse(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

function toHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')
}

/** amount > 0 lightens toward white, < 0 darkens toward black. */
export function shade(hex: string, amount: number): string {
  const [r, g, b] = parse(hex)
  const target = amount > 0 ? 255 : 0
  const t = Math.abs(amount)
  return toHex(r + (target - r) * t, g + (target - g) * t, b + (target - b) * t)
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = parse(a)
  const [r2, g2, b2] = parse(b)
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t)
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parse(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Soft light falloff — a flat translucent circle reads as a hard disc.
 * Lives here rather than in scenery.ts so the furniture module can use it
 * without pulling in the room renderer.
 */
export function glow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  alpha: number,
) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, withAlpha(color, alpha))
  g.addColorStop(0.55, withAlpha(color, alpha * 0.4))
  g.addColorStop(1, withAlpha(color, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

/** Penguin body colours, keyed by the item id that unlocks them. */
export const PENGUIN_COLORS: Record<string, string> = {
  color_blue: '#3179d8',
  color_red: '#d94141',
  color_green: '#3fa855',
  color_pink: '#ef82b8',
  color_purple: '#8b5cd6',
  color_orange: '#f08a2e',
  color_aqua: '#2fb6c4',
  color_yellow: '#e9c33c',
  color_black: '#3c4653',
  color_mint: '#7fd6a8',
}

export function bodyColor(colorId: string): string {
  return PENGUIN_COLORS[colorId] ?? PENGUIN_COLORS.color_blue
}
