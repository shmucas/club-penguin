import { glow, mix, shade, withAlpha } from './palette'

/**
 * A piece of igloo furniture. Everything is drawn with the origin at the
 * bottom-centre of the piece, so placing it is just a translate to a floor
 * position. `w`/`h` give the hit box used by the igloo editor.
 */
export interface Furniture {
  id: string
  name: string
  cost: number
  w: number
  h: number
  /** Rugs lie on the floor and are always drawn beneath penguins. */
  flat?: boolean
  draw: (ctx: CanvasRenderingContext2D, t: number) => void
}

function shadow(ctx: CanvasRenderingContext2D, rx: number, ry = 7) {
  ctx.fillStyle = withAlpha('#0b1b33', 0.16)
  ctx.beginPath()
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
}

const sofa: Furniture['draw'] = (ctx) => {
  shadow(ctx, 76, 9)
  ctx.fillStyle = '#4e6a9c'
  ctx.beginPath()
  ctx.roundRect(-72, -66, 144, 44, [12, 12, 4, 4])
  ctx.fill()
  ctx.fillStyle = '#5c7cb4'
  ctx.beginPath()
  ctx.roundRect(-72, -34, 144, 30, 8)
  ctx.fill()
  ctx.fillStyle = '#43598a'
  for (const x of [-72, 48]) {
    ctx.beginPath()
    ctx.roundRect(x, -52, 24, 48, 9)
    ctx.fill()
  }
  ctx.strokeStyle = withAlpha('#2c3d5e', 0.5)
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, -62)
  ctx.lineTo(0, -30)
  ctx.stroke()
  ctx.fillStyle = '#3a4a6b'
  ctx.fillRect(-60, -6, 10, 8)
  ctx.fillRect(50, -6, 10, 8)
}

const armchair: Furniture['draw'] = (ctx) => {
  shadow(ctx, 46, 7)
  ctx.fillStyle = '#a8544f'
  ctx.beginPath()
  ctx.roundRect(-40, -72, 80, 48, [12, 12, 4, 4])
  ctx.fill()
  ctx.fillStyle = '#c06a63'
  ctx.beginPath()
  ctx.roundRect(-40, -36, 80, 30, 8)
  ctx.fill()
  ctx.fillStyle = '#8f4540'
  for (const x of [-42, 26]) {
    ctx.beginPath()
    ctx.roundRect(x, -54, 16, 50, 8)
    ctx.fill()
  }
}

const table: Furniture['draw'] = (ctx) => {
  shadow(ctx, 36, 6)
  ctx.fillStyle = '#8a6038'
  ctx.fillRect(-8, -48, 16, 48)
  ctx.beginPath()
  ctx.ellipse(0, -2, 26, 8, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#b98a54'
  ctx.beginPath()
  ctx.ellipse(0, -52, 54, 17, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#a1743f'
  ctx.beginPath()
  ctx.ellipse(0, -49, 54, 17, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#b98a54'
  ctx.beginPath()
  ctx.ellipse(0, -53, 54, 17, 0, 0, Math.PI * 2)
  ctx.fill()
}

const lamp: Furniture['draw'] = (ctx) => {
  shadow(ctx, 22, 5)
  glow(ctx, 0, -104, 76, '#ffe9a8', 0.32)
  ctx.fillStyle = '#5a6b7d'
  ctx.fillRect(-3, -112, 6, 112)
  ctx.beginPath()
  ctx.ellipse(0, -2, 20, 6, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f3d78a'
  ctx.beginPath()
  ctx.moveTo(-26, -104)
  ctx.lineTo(26, -104)
  ctx.lineTo(16, -136)
  ctx.lineTo(-16, -136)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = withAlpha('#ffffff', 0.35)
  ctx.fillRect(-26, -108, 52, 4)
}

const plant: Furniture['draw'] = (ctx) => {
  shadow(ctx, 26, 6)
  ctx.fillStyle = '#c47a4e'
  ctx.beginPath()
  ctx.moveTo(-22, -32)
  ctx.lineTo(22, -32)
  ctx.lineTo(16, 0)
  ctx.lineTo(-16, 0)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#a8613b'
  ctx.fillRect(-24, -36, 48, 8)
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.38
    ctx.fillStyle = mix('#2f8a52', '#5fbf7f', (i % 3) / 3)
    ctx.save()
    ctx.translate(0, -34)
    ctx.rotate(a)
    ctx.beginPath()
    ctx.ellipse(0, -30, 10, 30, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

const tv: Furniture['draw'] = (ctx, t) => {
  shadow(ctx, 56, 7)
  ctx.fillStyle = '#6b4a30'
  ctx.beginPath()
  ctx.roundRect(-52, -34, 104, 32, 4)
  ctx.fill()
  ctx.fillStyle = '#2b3240'
  ctx.beginPath()
  ctx.roundRect(-56, -100, 112, 66, 6)
  ctx.fill()
  const flick = 0.55 + Math.sin(t * 9) * 0.08
  ctx.fillStyle = withAlpha('#6fc9f0', flick)
  ctx.beginPath()
  ctx.roundRect(-48, -93, 96, 52, 3)
  ctx.fill()
  ctx.fillStyle = withAlpha('#ffffff', 0.3)
  ctx.beginPath()
  ctx.moveTo(-48, -41)
  ctx.lineTo(-10, -93)
  ctx.lineTo(10, -93)
  ctx.lineTo(-28, -41)
  ctx.closePath()
  ctx.fill()
}

const shelf: Furniture['draw'] = (ctx) => {
  shadow(ctx, 52, 6)
  ctx.fillStyle = '#8a6038'
  ctx.beginPath()
  ctx.roundRect(-52, -134, 104, 134, 4)
  ctx.fill()
  ctx.fillStyle = '#6b4a30'
  for (let i = 0; i < 3; i++) ctx.fillRect(-48, -104 + i * 34, 96, 6)
  const books = ['#c0392b', '#2f6f9e', '#e8b53f', '#3f8a5c', '#8b5cd6']
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 8; i++) {
      const h = 20 + ((row * 8 + i) % 4) * 3
      ctx.fillStyle = books[(row * 3 + i) % books.length]
      ctx.fillRect(-46 + i * 11, -104 + row * 34 - h, 9, h)
    }
  }
}

const fishtank: Furniture['draw'] = (ctx, t) => {
  shadow(ctx, 56, 7)
  ctx.fillStyle = '#6b4a30'
  ctx.beginPath()
  ctx.roundRect(-54, -22, 108, 22, 4)
  ctx.fill()
  ctx.fillStyle = withAlpha('#3fa9d8', 0.75)
  ctx.beginPath()
  ctx.roundRect(-50, -90, 100, 68, 5)
  ctx.fill()
  ctx.fillStyle = '#c9a06a'
  ctx.fillRect(-50, -32, 100, 10)
  for (let i = 0; i < 2; i++) {
    const fx = -30 + Math.sin(t * (1.1 + i * 0.5) + i * 2) * 26
    const dir = Math.cos(t * (1.1 + i * 0.5) + i * 2) > 0 ? 1 : -1
    ctx.save()
    ctx.translate(fx + 30, -60 + i * 18)
    ctx.scale(dir, 1)
    ctx.fillStyle = i ? '#f2a03d' : '#ff6f61'
    ctx.beginPath()
    ctx.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-8, 0)
    ctx.lineTo(-14, -5)
    ctx.lineTo(-14, 5)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
  ctx.strokeStyle = withAlpha('#ffffff', 0.5)
  ctx.lineWidth = 3
  ctx.strokeRect(-50, -90, 100, 68)
}

const rug: Furniture['draw'] = (ctx) => {
  ctx.fillStyle = '#b8524f'
  ctx.beginPath()
  ctx.ellipse(0, 0, 84, 30, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#e0dcc8'
  ctx.beginPath()
  ctx.ellipse(0, 0, 62, 22, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#b8524f'
  ctx.beginPath()
  ctx.ellipse(0, 0, 40, 14, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#e0dcc8'
  ctx.beginPath()
  ctx.ellipse(0, 0, 18, 6, 0, 0, Math.PI * 2)
  ctx.fill()
}

const fire: Furniture['draw'] = (ctx, t) => {
  shadow(ctx, 62, 7)
  ctx.fillStyle = '#8794a4'
  ctx.beginPath()
  ctx.roundRect(-62, -108, 124, 108, 6)
  ctx.fill()
  ctx.fillStyle = '#6d7a8a'
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      ctx.fillRect(-58 + c * 24 + (r % 2 ? 12 : 0), -104 + r * 16, 20, 12)
    }
  }
  ctx.fillStyle = '#2b2320'
  ctx.beginPath()
  ctx.roundRect(-38, -62, 76, 62, [8, 8, 0, 0])
  ctx.fill()
  ctx.fillStyle = '#6b4a30'
  ctx.fillRect(-30, -14, 60, 8)
  for (let i = 0; i < 3; i++) {
    const flick = Math.sin(t * 7 + i * 2) * 0.5 + 0.5
    const h = 26 + flick * 16
    ctx.fillStyle = i === 1 ? '#ffd166' : '#ff8c42'
    ctx.beginPath()
    ctx.moveTo(-16 + i * 16, -10)
    ctx.quadraticCurveTo(-22 + i * 16, -10 - h * 0.6, -10 + i * 16, -10 - h)
    ctx.quadraticCurveTo(-2 + i * 16, -10 - h * 0.6, -4 + i * 16, -10)
    ctx.closePath()
    ctx.fill()
  }
  glow(ctx, 0, -34, 96, '#ffb703', 0.3)
}

const snowman: Furniture['draw'] = (ctx) => {
  shadow(ctx, 34, 7)
  ctx.fillStyle = '#f4f9fd'
  for (const [cy, r] of [[-24, 26], [-62, 20], [-92, 15]] as const) {
    ctx.beginPath()
    ctx.arc(0, cy, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#d7e6f2'
  ctx.beginPath()
  ctx.ellipse(0, -12, 22, 7, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#2b3240'
  for (const [x, y] of [[-5, -96], [5, -96]] as const) {
    ctx.beginPath()
    ctx.arc(x, y, 2.4, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.arc(0, -68 + i * 14, 3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#f08a2e'
  ctx.beginPath()
  ctx.moveTo(0, -91)
  ctx.lineTo(16, -88)
  ctx.lineTo(0, -86)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#8a6038'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(-19, -66)
  ctx.lineTo(-38, -80)
  ctx.moveTo(19, -66)
  ctx.lineTo(38, -80)
  ctx.stroke()
  ctx.fillStyle = '#c0392b'
  ctx.fillRect(-16, -110, 32, 6)
  ctx.fillRect(-11, -126, 22, 18)
}

const speaker: Furniture['draw'] = (ctx, t) => {
  const thump = 1 + Math.sin(t * 6) * 0.03
  ctx.save()
  ctx.scale(thump, thump)
  shadow(ctx, 38, 6)
  ctx.fillStyle = '#332248'
  ctx.beginPath()
  ctx.roundRect(-34, -132, 68, 132, 6)
  ctx.fill()
  ctx.fillStyle = '#1c1230'
  ctx.beginPath()
  ctx.arc(0, -94, 22, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(0, -36, 15, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#4b3a66'
  ctx.beginPath()
  ctx.arc(0, -94, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const throne: Furniture['draw'] = (ctx) => {
  shadow(ctx, 48, 7)
  ctx.fillStyle = '#d9a91f'
  ctx.beginPath()
  ctx.roundRect(-42, -150, 84, 106, [16, 16, 0, 0])
  ctx.fill()
  ctx.fillStyle = '#f3c73f'
  ctx.beginPath()
  ctx.roundRect(-36, -144, 72, 96, [12, 12, 0, 0])
  ctx.fill()
  ctx.fillStyle = '#b8524f'
  ctx.beginPath()
  ctx.roundRect(-30, -132, 60, 78, 8)
  ctx.fill()
  ctx.fillStyle = '#d9a91f'
  ctx.beginPath()
  ctx.roundRect(-46, -54, 92, 22, 6)
  ctx.fill()
  ctx.fillStyle = '#f3c73f'
  for (const x of [-46, 34]) {
    ctx.beginPath()
    ctx.roundRect(x, -76, 12, 76, 5)
    ctx.fill()
  }
  ctx.fillStyle = '#e0525f'
  ctx.beginPath()
  ctx.arc(0, -140, 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#4fa3e3'
  ctx.beginPath()
  ctx.arc(-20, -136, 4, 0, Math.PI * 2)
  ctx.arc(20, -136, 4, 0, Math.PI * 2)
  ctx.fill()
}

const bed: Furniture['draw'] = (ctx) => {
  shadow(ctx, 82, 8)
  ctx.fillStyle = '#8a6038'
  ctx.beginPath()
  ctx.roundRect(-80, -72, 22, 72, 5)
  ctx.fill()
  ctx.beginPath()
  ctx.roundRect(58, -46, 22, 46, 5)
  ctx.fill()
  ctx.fillStyle = '#b98a54'
  ctx.beginPath()
  ctx.roundRect(-76, -40, 152, 30, 5)
  ctx.fill()
  ctx.fillStyle = '#e8eef5'
  ctx.beginPath()
  ctx.roundRect(-72, -52, 148, 18, 7)
  ctx.fill()
  ctx.fillStyle = '#5c8ec4'
  ctx.beginPath()
  ctx.roundRect(-16, -54, 92, 22, 7)
  ctx.fill()
  ctx.fillStyle = '#f7fbff'
  ctx.beginPath()
  ctx.roundRect(-70, -62, 44, 22, 9)
  ctx.fill()
}

const piano: Furniture['draw'] = (ctx) => {
  shadow(ctx, 76, 8)
  ctx.fillStyle = '#22262e'
  ctx.beginPath()
  ctx.roundRect(-72, -100, 144, 78, 6)
  ctx.fill()
  ctx.fillStyle = '#2f3540'
  ctx.beginPath()
  ctx.roundRect(-72, -44, 144, 22, 4)
  ctx.fill()
  ctx.fillStyle = '#f7f9fb'
  for (let i = 0; i < 14; i++) ctx.fillRect(-68 + i * 10, -40, 8, 16)
  ctx.fillStyle = '#22262e'
  for (let i = 0; i < 13; i++) {
    if (i % 7 === 2 || i % 7 === 6) continue
    ctx.fillRect(-62 + i * 10, -40, 5, 10)
  }
  ctx.fillStyle = '#1a1d23'
  ctx.fillRect(-66, -22, 10, 22)
  ctx.fillRect(56, -22, 10, 22)
  ctx.fillStyle = withAlpha('#ffffff', 0.12)
  ctx.beginPath()
  ctx.roundRect(-64, -94, 128, 20, 4)
  ctx.fill()
}

const tree: Furniture['draw'] = (ctx) => {
  shadow(ctx, 34, 6)
  ctx.fillStyle = '#6b4a30'
  ctx.fillRect(-6, -30, 12, 30)
  for (let i = 0; i < 3; i++) {
    const ty = -30 - i * 30
    const w = 74 - i * 18
    ctx.fillStyle = mix('#2f6b48', '#3f8a5c', i / 3)
    ctx.beginPath()
    ctx.moveTo(0, ty - 46)
    ctx.lineTo(w / 2, ty)
    ctx.lineTo(-w / 2, ty)
    ctx.closePath()
    ctx.fill()
  }
  ctx.fillStyle = '#f3c73f'
  ctx.beginPath()
  ctx.arc(0, -122, 7, 0, Math.PI * 2)
  ctx.fill()
}

export const FURNITURE: Furniture[] = [
  { id: 'furn_sofa', name: 'Comfy Sofa', cost: 220, w: 150, h: 70, draw: sofa },
  { id: 'furn_armchair', name: 'Armchair', cost: 160, w: 90, h: 76, draw: armchair },
  { id: 'furn_table', name: 'Round Table', cost: 140, w: 110, h: 70, draw: table },
  { id: 'furn_lamp', name: 'Floor Lamp', cost: 120, w: 54, h: 140, draw: lamp },
  { id: 'furn_plant', name: 'Potted Plant', cost: 100, w: 62, h: 96, draw: plant },
  { id: 'furn_tv', name: 'Television', cost: 380, w: 116, h: 102, draw: tv },
  { id: 'furn_shelf', name: 'Bookshelf', cost: 260, w: 108, h: 136, draw: shelf },
  { id: 'furn_fishtank', name: 'Fish Tank', cost: 420, w: 112, h: 92, draw: fishtank },
  { id: 'furn_rug', name: 'Round Rug', cost: 130, w: 170, h: 60, flat: true, draw: rug },
  { id: 'furn_fire', name: 'Fireplace', cost: 480, w: 128, h: 112, draw: fire },
  { id: 'furn_snowman', name: 'Indoor Snowman', cost: 190, w: 80, h: 130, draw: snowman },
  { id: 'furn_speaker', name: 'Big Speaker', cost: 340, w: 72, h: 136, draw: speaker },
  { id: 'furn_throne', name: 'Golden Throne', cost: 900, w: 96, h: 154, draw: throne },
  { id: 'furn_bed', name: 'Cosy Bed', cost: 300, w: 164, h: 76, draw: bed },
  { id: 'furn_piano', name: 'Piano', cost: 700, w: 148, h: 104, draw: piano },
  { id: 'furn_tree', name: 'Little Pine', cost: 150, w: 78, h: 130, draw: tree },
]

export const FURNITURE_BY_ID: Record<string, Furniture> = Object.fromEntries(
  FURNITURE.map((f) => [f.id, f]),
)

/** A piece of furniture placed in an igloo. */
export interface PlacedItem {
  item: string
  x: number
  y: number
}

/** Is (px, py) inside this placed piece's hit box? */
export function hitsFurniture(placed: PlacedItem, px: number, py: number): boolean {
  const f = FURNITURE_BY_ID[placed.item]
  if (!f) return false
  const halfW = f.w / 2
  const top = placed.y - (f.flat ? f.h / 2 : f.h)
  const bottom = placed.y + (f.flat ? f.h / 2 : 10)
  return px >= placed.x - halfW && px <= placed.x + halfW && py >= top && py <= bottom
}

/** Draws one piece scaled to fit a preview canvas. */
export function drawFurniturePreview(canvas: HTMLCanvasElement, id: string, now: number) {
  const f = FURNITURE_BY_ID[id]
  const ctx = canvas.getContext('2d')
  if (!f || !ctx) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = canvas.clientWidth || 100
  const h = canvas.clientHeight || 90
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  const scale = Math.min((w - 12) / f.w, (h - 12) / Math.max(f.h, 40))
  ctx.save()
  ctx.translate(w / 2, h - 8)
  ctx.scale(scale, scale)
  f.draw(ctx, now / 1000)
  ctx.restore()
}

/** Outline drawn around the piece being edited. */
export function drawFurnitureHighlight(
  ctx: CanvasRenderingContext2D,
  placed: PlacedItem,
  t: number,
  color = '#ffd166',
) {
  const f = FURNITURE_BY_ID[placed.item]
  if (!f) return
  const top = placed.y - (f.flat ? f.h / 2 : f.h)
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.setLineDash([8, 6])
  ctx.lineDashOffset = -t * 20
  ctx.beginPath()
  ctx.roundRect(placed.x - f.w / 2 - 6, top - 6, f.w + 12, (placed.y - top) + 18, 10)
  ctx.stroke()
  ctx.restore()
}

// ---------------------------------------------------------------------------
// Igloo styles
// ---------------------------------------------------------------------------

export interface IglooStyle {
  id: string
  name: string
  cost: number
  floorY: number
  paint: (ctx: CanvasRenderingContext2D, t: number, w: number, h: number) => void
}

/**
 * Lays down an arched interior: a dark surround, a domed wall clipped to a big
 * ellipse, and a floor. Returns the dome path so callers can add their own
 * texture inside it.
 */
function domeInterior(
  ctx: CanvasRenderingContext2D,
  w: number,
  floorY: number,
  opts: {
    surround: string
    wallTop: string
    wallBottom: string
    floor: string
    rimLight?: string
  },
) {
  const rx = w * 0.48
  const ry = floorY * 0.94

  ctx.fillStyle = opts.surround
  ctx.fillRect(0, 0, w, floorY)

  const dome = () => {
    ctx.beginPath()
    ctx.ellipse(w / 2, floorY, rx, ry, 0, Math.PI, 0)
    ctx.closePath()
  }

  ctx.save()
  dome()
  ctx.clip()
  const g = ctx.createLinearGradient(0, floorY - ry, 0, floorY)
  g.addColorStop(0, opts.wallTop)
  g.addColorStop(1, opts.wallBottom)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, floorY)
  ctx.restore()

  // Floor, lit from the middle of the room.
  const fg = ctx.createLinearGradient(0, floorY, 0, 720)
  fg.addColorStop(0, shade(opts.floor, -0.1))
  fg.addColorStop(1, opts.floor)
  ctx.fillStyle = fg
  ctx.fillRect(0, floorY, w, 720 - floorY)

  // Where the wall meets the floor.
  ctx.fillStyle = withAlpha('#000000', 0.18)
  ctx.fillRect(0, floorY - 10, w, 10)

  return { dome, rx, ry }
}

export const IGLOO_STYLES: IglooStyle[] = [
  {
    id: 'igloo_classic',
    name: 'Snow Igloo',
    cost: 0,
    floorY: 470,
    paint: (ctx, _t, w) => {
      const floorY = 470
      const { dome, rx, ry } = domeInterior(ctx, w, floorY, {
        surround: '#5b83a8',
        wallTop: '#d4e9f7',
        wallBottom: '#8bbcdd',
        floor: '#eaf4fc',
      })

      // Snow-block courses, curved to follow the dome and clipped inside it.
      ctx.save()
      dome()
      ctx.clip()
      ctx.strokeStyle = withAlpha('#ffffff', 0.55)
      ctx.lineWidth = 3
      const rows = 7
      for (let r = 1; r <= rows; r++) {
        const k = r / (rows + 1)
        ctx.beginPath()
        for (let a = Math.PI; a <= Math.PI * 2 + 0.01; a += 0.06) {
          const x = w / 2 + Math.cos(a) * rx * (1 - k * 0.02)
          const y = floorY + Math.sin(a) * ry * (1 - k)
          if (a === Math.PI) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      // Vertical joins, staggered course to course.
      for (let r = 0; r <= rows; r++) {
        const inner = r / (rows + 1)
        const outer = (r + 1) / (rows + 1)
        const step = 0.19
        for (let a = Math.PI + (r % 2 ? step / 2 : 0); a < Math.PI * 2; a += step) {
          ctx.beginPath()
          ctx.moveTo(w / 2 + Math.cos(a) * rx, floorY + Math.sin(a) * ry * (1 - inner))
          ctx.lineTo(w / 2 + Math.cos(a) * rx, floorY + Math.sin(a) * ry * (1 - outer))
          ctx.stroke()
        }
      }
      // Light pooling at the top of the dome.
      glow(ctx, w / 2, floorY - ry * 0.78, 320, '#ffffff', 0.3)
      ctx.restore()

      // Crisp rim so the arch reads clearly.
      ctx.strokeStyle = withAlpha('#ffffff', 0.85)
      ctx.lineWidth = 5
      dome()
      ctx.stroke()

      // Snow drifted against the base of the wall.
      ctx.fillStyle = withAlpha('#ffffff', 0.55)
      ctx.beginPath()
      ctx.ellipse(w / 2, floorY + 4, rx * 0.94, 42, 0, Math.PI, 0)
      ctx.fill()
    },
  },
  {
    id: 'igloo_cabin',
    name: 'Log Cabin',
    cost: 900,
    floorY: 480,
    paint: (ctx, _t, w) => {
      const { dome } = domeInterior(ctx, w, 480, {
        surround: '#4a3526',
        wallTop: '#d8ac74',
        wallBottom: '#9c6f3b',
        floor: '#8f5f37',
      })
      // Log courses, clipped to the cabin's arched roof.
      ctx.save()
      dome()
      ctx.clip()
      ctx.strokeStyle = withAlpha('#5f3a1f', 0.5)
      ctx.lineWidth = 3
      for (let y = 40; y < 480; y += 46) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }
      ctx.restore()
      // Window with a snowy view.
      ctx.fillStyle = '#5f3a1f'
      ctx.beginPath()
      ctx.roundRect(w * 0.62, 150, 190, 140, 8)
      ctx.fill()
      ctx.fillStyle = '#bfe0f2'
      ctx.beginPath()
      ctx.roundRect(w * 0.62 + 10, 160, 170, 120, 5)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.moveTo(w * 0.62 + 10, 250)
      ctx.lineTo(w * 0.62 + 70, 190)
      ctx.lineTo(w * 0.62 + 120, 250)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#5f3a1f'
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.moveTo(w * 0.62 + 95, 160)
      ctx.lineTo(w * 0.62 + 95, 280)
      ctx.stroke()
      ctx.fillStyle = '#8f5f37'
      ctx.fillRect(0, 480, w, 8)
    },
  },
  {
    id: 'igloo_deluxe',
    name: 'Ice Palace',
    cost: 1600,
    floorY: 470,
    paint: (ctx, t, w) => {
      const floorY = 470
      const { dome, rx, ry } = domeInterior(ctx, w, floorY, {
        surround: '#123a5e',
        wallTop: '#a5e2f5',
        wallBottom: '#2f7bb4',
        floor: '#d6ecfa',
      })

      ctx.save()
      dome()
      ctx.clip()

      // Faceted ice, cut as tall wedges radiating from the apex.
      for (let i = 0; i < 16; i++) {
        const a0 = Math.PI + (i / 16) * Math.PI
        const a1 = Math.PI + ((i + 1) / 16) * Math.PI
        ctx.fillStyle = withAlpha('#ffffff', 0.05 + ((i * 7) % 4) * 0.055)
        ctx.beginPath()
        ctx.moveTo(w / 2, floorY - ry * 0.1)
        ctx.lineTo(w / 2 + Math.cos(a0) * rx * 1.1, floorY + Math.sin(a0) * ry * 1.1)
        ctx.lineTo(w / 2 + Math.cos(a1) * rx * 1.1, floorY + Math.sin(a1) * ry * 1.1)
        ctx.closePath()
        ctx.fill()
      }

      // Frost creeping up from the base.
      const frost = ctx.createLinearGradient(0, floorY, 0, floorY - 190)
      frost.addColorStop(0, withAlpha('#ffffff', 0.5))
      frost.addColorStop(1, withAlpha('#ffffff', 0))
      ctx.fillStyle = frost
      ctx.fillRect(0, floorY - 190, w, 190)

      // Ice pillars.
      for (const px of [320, w - 320]) {
        const pg = ctx.createLinearGradient(px - 30, 0, px + 30, 0)
        pg.addColorStop(0, withAlpha('#ffffff', 0.28))
        pg.addColorStop(0.45, withAlpha('#ffffff', 0.72))
        pg.addColorStop(1, withAlpha('#9fd4ee', 0.4))
        ctx.fillStyle = pg
        ctx.fillRect(px - 26, 90, 52, floorY - 90)
        ctx.fillStyle = withAlpha('#eaf7ff', 0.85)
        ctx.beginPath()
        ctx.roundRect(px - 34, 74, 68, 20, 5)
        ctx.fill()
        ctx.beginPath()
        ctx.roundRect(px - 34, floorY - 22, 68, 22, 5)
        ctx.fill()
      }
      ctx.restore()

      ctx.strokeStyle = withAlpha('#eaf7ff', 0.9)
      ctx.lineWidth = 5
      dome()
      ctx.stroke()

      // Chandelier.
      const cy = 150
      const pulse = 0.5 + Math.sin(t * 2) * 0.12
      glow(ctx, w / 2, cy + 20, 230, '#cfeeff', 0.4 * pulse + 0.2)
      ctx.strokeStyle = withAlpha('#eaf7ff', 0.7)
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(w / 2, 0)
      ctx.lineTo(w / 2, cy - 46)
      ctx.stroke()
      // Icicle tiers.
      for (const [ringR, drop, alpha] of [
        [96, 78, 0.9],
        [62, 54, 0.75],
      ] as const) {
        ctx.fillStyle = withAlpha('#eaf7ff', alpha)
        for (let i = 0; i < 12; i++) {
          const x = w / 2 - ringR + (i / 11) * ringR * 2
          const h = drop * (0.55 + Math.abs(Math.cos((i / 11) * Math.PI)) * 0.65)
          ctx.beginPath()
          ctx.moveTo(x - 7, cy - 40)
          ctx.lineTo(x + 7, cy - 40)
          ctx.lineTo(x, cy - 40 + h)
          ctx.closePath()
          ctx.fill()
        }
        ctx.fillStyle = withAlpha('#ffffff', 0.95)
        ctx.beginPath()
        ctx.roundRect(w / 2 - ringR - 8, cy - 52, ringR * 2 + 16, 14, 7)
        ctx.fill()
      }
      ctx.fillStyle = withAlpha('#ffffff', 0.95)
      ctx.beginPath()
      ctx.arc(w / 2, cy - 52, 13, 0, Math.PI * 2)
      ctx.fill()

      // Polished floor: soft sheen plus reflections of the pillars.
      const sheen = ctx.createLinearGradient(0, floorY, 0, 720)
      sheen.addColorStop(0, withAlpha('#ffffff', 0.5))
      sheen.addColorStop(1, withAlpha('#ffffff', 0))
      ctx.fillStyle = sheen
      ctx.fillRect(0, floorY, w, 720 - floorY)
      for (const px of [320, w - 320]) {
        const r = ctx.createLinearGradient(0, floorY, 0, floorY + 120)
        r.addColorStop(0, withAlpha('#ffffff', 0.4))
        r.addColorStop(1, withAlpha('#ffffff', 0))
        ctx.fillStyle = r
        ctx.fillRect(px - 26, floorY, 52, 120)
      }
    },
  },
]

export const IGLOO_STYLES_BY_ID: Record<string, IglooStyle> = Object.fromEntries(
  IGLOO_STYLES.map((s) => [s.id, s]),
)
