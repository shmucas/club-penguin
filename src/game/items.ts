import type { Slot } from '../lib/types'
import { FURNITURE, IGLOO_STYLES } from './furniture'
import { PENGUIN_COLORS, shade, withAlpha } from './palette'
import { PUFFLE_COLORS, pufflePreviewSwatch } from './puffles'

/**
 * Penguin geometry, in "penguin local space": feet sit on y = 0, up is negative,
 * and +x is whichever way the penguin is facing (the caller flips the canvas).
 * Every clothing item anchors to these numbers.
 */
export const P = {
  bodyCx: 0,
  bodyCy: -26,
  bodyRx: 21,
  bodyRy: 25,
  headCx: 0,
  headCy: -48,
  headR: 16.5,
  headTop: -64.5,
  eyeX: 6,
  eyeY: -52,
  beakY: -45,
  flipperX: 20,
  flipperY: -32,
  footX: 9,
  footY: -2,
}

export interface DrawCtx {
  /** Body colour of the wearer, for items that tint themselves. */
  body: string
  /** Seconds since page load, for spinning/swaying items. */
  t: number
}

export interface Item {
  id: string
  name: string
  slot: Slot | 'color' | 'furniture' | 'igloo'
  cost: number
  /** Drawn behind the penguin (capes). */
  drawBack?: (ctx: CanvasRenderingContext2D, d: DrawCtx) => void
  /** Drawn in front, at the z-level of its slot. */
  draw?: (ctx: CanvasRenderingContext2D, d: DrawCtx) => void
}

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2)
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** Clip subsequent drawing to the penguin's body blob, so shirts hug the shape. */
export function clipBody(ctx: CanvasRenderingContext2D) {
  ctx.beginPath()
  ctx.ellipse(P.bodyCx, P.bodyCy, P.bodyRx, P.bodyRy, 0, 0, Math.PI * 2)
  ctx.clip()
}

// ---------------------------------------------------------------------------
// Hats
// ---------------------------------------------------------------------------

const beanie: Item['draw'] = (ctx) => {
  ctx.fillStyle = '#d64b5b'
  ctx.beginPath()
  ctx.arc(P.headCx, P.headCy - 4, P.headR + 1.5, Math.PI, 0)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#f0f4f8'
  roundRect(ctx, -P.headR - 2, P.headCy - 6, (P.headR + 2) * 2, 6, 3)
  ctx.fill()
  ctx.fillStyle = '#f0f4f8'
  ellipse(ctx, 0, P.headTop - 5, 5, 5)
  ctx.fill()
}

const cap: Item['draw'] = (ctx) => {
  ctx.fillStyle = '#2f7d4f'
  ctx.beginPath()
  ctx.arc(P.headCx, P.headCy - 3, P.headR + 1, Math.PI, 0)
  ctx.closePath()
  ctx.fill()
  // Brim pointing backwards.
  ctx.fillStyle = '#26663f'
  roundRect(ctx, -P.headR - 11, P.headCy - 6, 12, 5, 2.5)
  ctx.fill()
  ctx.fillStyle = '#f7f7f7'
  ellipse(ctx, 2, P.headCy - 12, 3, 3)
  ctx.fill()
}

const viking: Item['draw'] = (ctx) => {
  ctx.fillStyle = '#9aa6b4'
  ctx.beginPath()
  ctx.arc(P.headCx, P.headCy - 2, P.headR + 2.5, Math.PI, 0)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#7d8896'
  roundRect(ctx, -P.headR - 3, P.headCy - 5, (P.headR + 3) * 2, 5, 2)
  ctx.fill()
  // Nose guard.
  ctx.fillStyle = '#8d99a7'
  roundRect(ctx, 2, P.headCy - 4, 5, 12, 2)
  ctx.fill()
  // Horns.
  ctx.fillStyle = '#f2e6cf'
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(s * (P.headR - 1), P.headCy - 6)
    ctx.quadraticCurveTo(s * (P.headR + 12), P.headCy - 16, s * (P.headR + 6), P.headCy - 22)
    ctx.quadraticCurveTo(s * (P.headR + 11), P.headCy - 12, s * (P.headR - 1), P.headCy - 1)
    ctx.closePath()
    ctx.fill()
  }
}

const topHat: Item['draw'] = (ctx) => {
  ctx.fillStyle = '#22262e'
  roundRect(ctx, -13, P.headTop - 20, 26, 22, 2)
  ctx.fill()
  roundRect(ctx, -20, P.headTop - 1, 40, 5, 2.5)
  ctx.fill()
  ctx.fillStyle = '#c0392b'
  ctx.fillRect(-13, P.headTop - 6, 26, 5)
}

const crown: Item['draw'] = (ctx) => {
  const y = P.headTop + 2
  ctx.fillStyle = '#f3c73f'
  ctx.beginPath()
  ctx.moveTo(-15, y)
  ctx.lineTo(-15, y - 14)
  ctx.lineTo(-7.5, y - 6)
  ctx.lineTo(0, y - 17)
  ctx.lineTo(7.5, y - 6)
  ctx.lineTo(15, y - 14)
  ctx.lineTo(15, y)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#d9a91f'
  ctx.fillRect(-15, y - 4, 30, 4)
  ctx.fillStyle = '#e0525f'
  ellipse(ctx, 0, y - 2, 2.4, 2.4)
  ctx.fill()
  ctx.fillStyle = '#4fa3e3'
  ellipse(ctx, -9, y - 2, 1.8, 1.8)
  ctx.fill()
  ellipse(ctx, 9, y - 2, 1.8, 1.8)
  ctx.fill()
}

const propeller: Item['draw'] = (ctx, d) => {
  ctx.fillStyle = '#e14b4b'
  ctx.beginPath()
  ctx.arc(P.headCx, P.headCy - 4, P.headR - 1, Math.PI, 0)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#f3d34a'
  ctx.beginPath()
  ctx.arc(P.headCx, P.headCy - 4, P.headR - 1, Math.PI, Math.PI * 1.5)
  ctx.lineTo(0, P.headCy - 4)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#8c8f96'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, P.headTop + 2)
  ctx.lineTo(0, P.headTop - 7)
  ctx.stroke()
  // Spinning blades, squashed on the x axis to fake rotation.
  ctx.save()
  ctx.translate(0, P.headTop - 8)
  ctx.scale(Math.cos(d.t * 9), 1)
  ctx.fillStyle = '#5aa9e6'
  roundRect(ctx, -13, -1.6, 26, 3.2, 1.6)
  ctx.fill()
  ctx.restore()
}

const earmuffs: Item['draw'] = (ctx) => {
  ctx.strokeStyle = '#4a5568'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(P.headCx, P.headCy, P.headR + 1, Math.PI * 1.15, Math.PI * 1.85)
  ctx.stroke()
  ctx.fillStyle = '#e0788f'
  for (const s of [-1, 1]) {
    ellipse(ctx, s * (P.headR + 1), P.headCy - 1, 5, 6.5)
    ctx.fill()
  }
}

// ---------------------------------------------------------------------------
// Shirts (drawn clipped to the body)
// ---------------------------------------------------------------------------

const stripes: Item['draw'] = (ctx) => {
  ctx.save()
  clipBody(ctx)
  ctx.fillStyle = '#e8e3d6'
  ctx.fillRect(-P.bodyRx, P.bodyCy - 16, P.bodyRx * 2, 34)
  ctx.fillStyle = '#c0504d'
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(-P.bodyRx, P.bodyCy - 16 + i * 8, P.bodyRx * 2, 4)
  }
  ctx.restore()
}

const hoodie: Item['draw'] = (ctx) => {
  ctx.save()
  clipBody(ctx)
  ctx.fillStyle = '#5b6b8c'
  ctx.fillRect(-P.bodyRx, P.bodyCy - 18, P.bodyRx * 2, 40)
  ctx.fillStyle = '#4a5876'
  roundRect(ctx, -9, P.bodyCy + 2, 18, 10, 4)
  ctx.fill()
  ctx.restore()
  // Hood bunched behind the head.
  ctx.fillStyle = '#4a5876'
  ellipse(ctx, -6, P.bodyCy - 20, 12, 8, -0.4)
  ctx.fill()
  ctx.strokeStyle = '#e6e9f0'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(-3, P.bodyCy - 15)
  ctx.lineTo(-4, P.bodyCy - 6)
  ctx.moveTo(3, P.bodyCy - 15)
  ctx.lineTo(4, P.bodyCy - 6)
  ctx.stroke()
}

const tux: Item['draw'] = (ctx) => {
  ctx.save()
  clipBody(ctx)
  ctx.fillStyle = '#20242c'
  ctx.fillRect(-P.bodyRx, P.bodyCy - 20, P.bodyRx * 2, 44)
  ctx.fillStyle = '#f4f6f8'
  ctx.beginPath()
  ctx.moveTo(0, P.bodyCy - 20)
  ctx.lineTo(9, P.bodyCy + 24)
  ctx.lineTo(-9, P.bodyCy + 24)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#20242c'
  for (let i = 0; i < 3; i++) {
    ellipse(ctx, 0, P.bodyCy - 2 + i * 7, 1.3, 1.3)
    ctx.fill()
  }
  ctx.restore()
}

const lifejacket: Item['draw'] = (ctx) => {
  ctx.save()
  clipBody(ctx)
  ctx.fillStyle = '#ef7d21'
  ctx.fillRect(-P.bodyRx, P.bodyCy - 18, 13, 40)
  ctx.fillRect(P.bodyRx - 13, P.bodyCy - 18, 13, 40)
  ctx.fillRect(-P.bodyRx, P.bodyCy - 18, P.bodyRx * 2, 9)
  ctx.strokeStyle = '#f7f2e8'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(-P.bodyRx, P.bodyCy + 4)
  ctx.lineTo(P.bodyRx, P.bodyCy + 4)
  ctx.stroke()
  ctx.restore()
}

const hawaii: Item['draw'] = (ctx) => {
  ctx.save()
  clipBody(ctx)
  ctx.fillStyle = '#25b39b'
  ctx.fillRect(-P.bodyRx, P.bodyCy - 18, P.bodyRx * 2, 42)
  ctx.fillStyle = '#f6e27a'
  for (let i = 0; i < 8; i++) {
    const x = -16 + (i % 4) * 11
    const y = P.bodyCy - 12 + Math.floor(i / 4) * 14
    ellipse(ctx, x, y, 3, 3)
    ctx.fill()
  }
  ctx.fillStyle = '#f4f7f8'
  ctx.beginPath()
  ctx.moveTo(0, P.bodyCy - 19)
  ctx.lineTo(7, P.bodyCy - 8)
  ctx.lineTo(0, P.bodyCy - 4)
  ctx.lineTo(-7, P.bodyCy - 8)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

// ---------------------------------------------------------------------------
// Neck
// ---------------------------------------------------------------------------

const scarf: Item['draw'] = (ctx) => {
  const y = P.bodyCy - 18
  ctx.fillStyle = '#c8443f'
  roundRect(ctx, -17, y - 3, 34, 8, 4)
  ctx.fill()
  ctx.fillStyle = '#a9362f'
  roundRect(ctx, 6, y + 2, 8, 20, 4)
  ctx.fill()
  ctx.fillStyle = withAlpha('#ffffff', 0.25)
  ctx.fillRect(-14, y - 1, 28, 2)
}

const bowtie: Item['draw'] = (ctx) => {
  const y = P.bodyCy - 16
  ctx.fillStyle = '#33415c'
  ctx.beginPath()
  ctx.moveTo(-1, y)
  ctx.lineTo(-10, y - 5)
  ctx.lineTo(-10, y + 5)
  ctx.closePath()
  ctx.moveTo(1, y)
  ctx.lineTo(10, y - 5)
  ctx.lineTo(10, y + 5)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#26314a'
  roundRect(ctx, -2.5, y - 3, 5, 6, 2)
  ctx.fill()
}

const cape: Item['drawBack'] = (ctx, d) => {
  const sway = Math.sin(d.t * 2.2) * 3
  ctx.fillStyle = '#b03a48'
  ctx.beginPath()
  ctx.moveTo(-16, P.bodyCy - 18)
  ctx.quadraticCurveTo(-30 - sway, P.bodyCy - 4, -24 - sway, P.bodyCy + 24)
  ctx.lineTo(14, P.bodyCy + 22)
  ctx.quadraticCurveTo(16, P.bodyCy - 6, 14, P.bodyCy - 18)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = withAlpha('#000000', 0.12)
  ctx.fillRect(-4, P.bodyCy - 18, 18, 42)
}

const capeClasp: Item['draw'] = (ctx) => {
  ctx.fillStyle = '#f3c73f'
  ellipse(ctx, 0, P.bodyCy - 17, 3, 3)
  ctx.fill()
}

// ---------------------------------------------------------------------------
// Hand items (held at the front flipper)
// ---------------------------------------------------------------------------

const HAND_X = 25
const HAND_Y = -20

const flag: Item['draw'] = (ctx, d) => {
  ctx.strokeStyle = '#8a6a44'
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.moveTo(HAND_X, HAND_Y + 6)
  ctx.lineTo(HAND_X, HAND_Y - 30)
  ctx.stroke()
  const wave = Math.sin(d.t * 4) * 2
  ctx.fillStyle = '#3fa9d8'
  ctx.beginPath()
  ctx.moveTo(HAND_X + 1, HAND_Y - 30)
  ctx.quadraticCurveTo(HAND_X + 14, HAND_Y - 26 + wave, HAND_X + 22, HAND_Y - 22)
  ctx.lineTo(HAND_X + 1, HAND_Y - 14)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#f4f9fc'
  ellipse(ctx, HAND_X + 9, HAND_Y - 22, 2.6, 2.6)
  ctx.fill()
}

const lantern: Item['draw'] = (ctx, d) => {
  const glow = 0.35 + Math.sin(d.t * 3) * 0.08
  ctx.strokeStyle = '#6b7482'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.arc(HAND_X + 4, HAND_Y + 2, 5, Math.PI, 0)
  ctx.stroke()
  ctx.fillStyle = withAlpha('#ffd77a', glow)
  ellipse(ctx, HAND_X + 4, HAND_Y + 12, 14, 14)
  ctx.fill()
  ctx.fillStyle = '#4f5a68'
  roundRect(ctx, HAND_X - 2, HAND_Y + 4, 12, 14, 2)
  ctx.fill()
  ctx.fillStyle = '#ffd77a'
  roundRect(ctx, HAND_X, HAND_Y + 6, 8, 10, 1.5)
  ctx.fill()
}

const rod: Item['draw'] = (ctx) => {
  ctx.strokeStyle = '#8a6a44'
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.moveTo(HAND_X - 4, HAND_Y + 10)
  ctx.lineTo(HAND_X + 20, HAND_Y - 22)
  ctx.stroke()
  ctx.strokeStyle = withAlpha('#ffffff', 0.7)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(HAND_X + 20, HAND_Y - 22)
  ctx.quadraticCurveTo(HAND_X + 26, HAND_Y - 8, HAND_X + 22, HAND_Y + 6)
  ctx.stroke()
  ctx.fillStyle = '#c9d3dd'
  ellipse(ctx, HAND_X + 22, HAND_Y + 7, 2, 3)
  ctx.fill()
}

const balloon: Item['draw'] = (ctx, d) => {
  const sway = Math.sin(d.t * 1.8) * 4
  const bx = HAND_X + 4 + sway
  const by = HAND_Y - 44
  ctx.strokeStyle = withAlpha('#ffffff', 0.75)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(HAND_X, HAND_Y + 4)
  ctx.quadraticCurveTo(HAND_X + 2, by + 18, bx, by + 11)
  ctx.stroke()
  ctx.fillStyle = '#e2504f'
  ellipse(ctx, bx, by, 10, 12)
  ctx.fill()
  ctx.fillStyle = withAlpha('#ffffff', 0.45)
  ellipse(ctx, bx - 3.5, by - 4, 2.6, 3.4, -0.4)
  ctx.fill()
  ctx.fillStyle = '#c33f3f'
  ctx.beginPath()
  ctx.moveTo(bx - 2.5, by + 11)
  ctx.lineTo(bx + 2.5, by + 11)
  ctx.lineTo(bx, by + 15)
  ctx.closePath()
  ctx.fill()
}

// ---------------------------------------------------------------------------
// Feet
// ---------------------------------------------------------------------------

const boots: Item['draw'] = (ctx) => {
  ctx.fillStyle = '#6b4a2f'
  for (const s of [-1, 1]) {
    roundRect(ctx, s * P.footX - 8, P.footY - 8, 16, 11, 3)
    ctx.fill()
  }
  ctx.fillStyle = '#4e3520'
  for (const s of [-1, 1]) {
    roundRect(ctx, s * P.footX - 8, P.footY + 1, 16, 3, 1.5)
    ctx.fill()
  }
}

const skis: Item['draw'] = (ctx) => {
  ctx.fillStyle = '#e04f4f'
  for (const s of [-1, 1]) {
    roundRect(ctx, s * P.footX - 16, P.footY + 1, 32, 3.5, 1.75)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(s * P.footX + 16, P.footY + 1)
    ctx.quadraticCurveTo(s * P.footX + 22, P.footY + 1, s * P.footX + 21, P.footY - 3)
    ctx.lineTo(s * P.footX + 16, P.footY + 4.5)
    ctx.closePath()
    ctx.fill()
  }
}

// ---------------------------------------------------------------------------
// Catalogue — ids and costs must match supabase/schema.sql
// ---------------------------------------------------------------------------

function colorItem(id: string, name: string, cost: number): Item {
  return { id, name, slot: 'color', cost }
}

export const ITEMS: Item[] = [
  colorItem('color_blue', 'Blue', 0),
  colorItem('color_red', 'Red', 120),
  colorItem('color_green', 'Green', 120),
  colorItem('color_pink', 'Pink', 120),
  colorItem('color_purple', 'Purple', 160),
  colorItem('color_orange', 'Orange', 160),
  colorItem('color_aqua', 'Aqua', 160),
  colorItem('color_yellow', 'Yellow', 200),
  colorItem('color_black', 'Black', 400),
  colorItem('color_mint', 'Mint', 400),

  { id: 'hat_beanie', name: 'Bobble Beanie', slot: 'hat', cost: 80, draw: beanie },
  { id: 'hat_cap', name: 'Backwards Cap', slot: 'hat', cost: 90, draw: cap },
  { id: 'hat_viking', name: 'Viking Helmet', slot: 'hat', cost: 350, draw: viking },
  { id: 'hat_top', name: 'Top Hat', slot: 'hat', cost: 300, draw: topHat },
  { id: 'hat_crown', name: 'Gold Crown', slot: 'hat', cost: 800, draw: crown },
  { id: 'hat_propeller', name: 'Propeller Cap', slot: 'hat', cost: 250, draw: propeller },
  { id: 'hat_earmuffs', name: 'Earmuffs', slot: 'hat', cost: 120, draw: earmuffs },

  { id: 'shirt_stripes', name: 'Striped Sweater', slot: 'shirt', cost: 150, draw: stripes },
  { id: 'shirt_hoodie', name: 'Cosy Hoodie', slot: 'shirt', cost: 200, draw: hoodie },
  { id: 'shirt_tux', name: 'Tuxedo', slot: 'shirt', cost: 450, draw: tux },
  { id: 'shirt_lifejacket', name: 'Life Jacket', slot: 'shirt', cost: 180, draw: lifejacket },
  { id: 'shirt_hawaii', name: 'Island Shirt', slot: 'shirt', cost: 220, draw: hawaii },

  { id: 'neck_scarf', name: 'Wool Scarf', slot: 'neck', cost: 100, draw: scarf },
  { id: 'neck_bowtie', name: 'Bow Tie', slot: 'neck', cost: 110, draw: bowtie },
  { id: 'neck_cape', name: 'Hero Cape', slot: 'neck', cost: 500, drawBack: cape, draw: capeClasp },

  { id: 'hand_flag', name: 'Island Flag', slot: 'hand', cost: 140, draw: flag },
  { id: 'hand_lantern', name: 'Snow Lantern', slot: 'hand', cost: 190, draw: lantern },
  { id: 'hand_rod', name: 'Fishing Rod', slot: 'hand', cost: 240, draw: rod },
  { id: 'hand_balloon', name: 'Red Balloon', slot: 'hand', cost: 160, draw: balloon },

  { id: 'feet_boots', name: 'Snow Boots', slot: 'feet', cost: 130, draw: boots },
  { id: 'feet_skis', name: 'Tiny Skis', slot: 'feet', cost: 280, draw: skis },

  // Puffles are drawn beside the penguin rather than on it, so they carry no
  // draw function here — see puffles.ts.
  { id: 'puffle_blue', name: 'Blue Puffle', slot: 'puffle', cost: 200 },
  { id: 'puffle_pink', name: 'Pink Puffle', slot: 'puffle', cost: 200 },
  { id: 'puffle_green', name: 'Green Puffle', slot: 'puffle', cost: 250 },
  { id: 'puffle_purple', name: 'Purple Puffle', slot: 'puffle', cost: 300 },
  { id: 'puffle_red', name: 'Red Puffle', slot: 'puffle', cost: 350 },
  { id: 'puffle_yellow', name: 'Yellow Puffle', slot: 'puffle', cost: 400 },
  { id: 'puffle_orange', name: 'Orange Puffle', slot: 'puffle', cost: 450 },
  { id: 'puffle_white', name: 'White Puffle', slot: 'puffle', cost: 600 },
  { id: 'puffle_black', name: 'Black Puffle', slot: 'puffle', cost: 750 },
  { id: 'puffle_rainbow', name: 'Rainbow Puffle', slot: 'puffle', cost: 1200 },

  // Furniture and igloo styles keep their costs in furniture.ts; mirroring them
  // into the catalogue means buy_item() and the inventory work unchanged.
  ...FURNITURE.map((f): Item => ({ id: f.id, name: f.name, slot: 'furniture', cost: f.cost })),
  ...IGLOO_STYLES.map((s): Item => ({ id: s.id, name: s.name, slot: 'igloo', cost: s.cost })),
]

export const ITEMS_BY_ID: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [i.id, i]))

export const SLOT_LABELS: Record<string, string> = {
  color: 'Colours',
  hat: 'Head',
  shirt: 'Body',
  neck: 'Neck',
  hand: 'Hand',
  feet: 'Feet',
  puffle: 'Puffles',
  furniture: 'Furniture',
  igloo: 'Igloos',
}

/** Swatch colour used for colour and puffle items in the shop grid. */
export function itemSwatch(id: string): string {
  if (id in PUFFLE_COLORS) return pufflePreviewSwatch(id)
  return PENGUIN_COLORS[id] ?? shade('#9fb3c8', 0)
}
