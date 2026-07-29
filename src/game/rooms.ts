import type { GameId, IglooData } from '../lib/types'
import { IGLOO_STYLES, IGLOO_STYLES_BY_ID, type PlacedItem } from './furniture'
import { mix, shade, withAlpha } from './palette'
import { WORLD_H, WORLD_W } from './render'
import {
  building,
  danceFloor,
  interiorWall,
  lamppost,
  mountains,
  moon,
  pineTree,
  rnd,
  sign,
  sky,
  snowfall,
  snowGround,
  snowMound,
  stars,
  water,
  woodFloor,
} from './scenery'

export type HotspotAction =
  | { type: 'room'; room: string }
  | { type: 'game'; game: GameId }
  | { type: 'shop' }
  | { type: 'puffles' }
  | { type: 'decorate' }

export interface Hotspot {
  x: number
  y: number
  w: number
  h: number
  label: string
  action: HotspotAction
}

export interface Room {
  id: string
  name: string
  /** Where penguins may waddle. */
  walk: { x1: number; y1: number; x2: number; y2: number }
  spawn: { x: number; y: number }
  hotspots: Hotspot[]
  paint: (ctx: CanvasRenderingContext2D, t: number) => void
  /** Interiors get a warmer chat panel; used for small UI touches. */
  indoor?: boolean
  /** Furniture, depth-sorted against penguins by the renderer. */
  props?: PlacedItem[]
  /** Set for igloos, so the UI can offer the decorate button to the owner. */
  iglooOwner?: string
}

export type RoomId =
  | 'town'
  | 'plaza'
  | 'dock'
  | 'ski-hill'
  | 'gift-shop'
  | 'coffee-shop'
  | 'night-club'

/** `igloo:<uuid>` rooms are built on demand from the database. */
export function isIglooRoom(id: string): boolean {
  return id.startsWith('igloo:')
}

export function iglooRoomId(ownerId: string): string {
  return `igloo:${ownerId}`
}

// ---------------------------------------------------------------------------
// Town — the hub
// ---------------------------------------------------------------------------

const town: Room = {
  id: 'town',
  name: 'Town Centre',
  walk: { x1: 70, y1: 530, x2: 1210, y2: 690 },
  spawn: { x: 640, y: 620 },
  hotspots: [
    { x: 196, y: 404, w: 108, h: 106, label: 'Enter', action: { type: 'room', room: 'coffee-shop' } },
    { x: 586, y: 394, w: 108, h: 116, label: 'Enter', action: { type: 'room', room: 'gift-shop' } },
    { x: 976, y: 404, w: 108, h: 106, label: 'Enter', action: { type: 'room', room: 'night-club' } },
    { x: 20, y: 560, w: 90, h: 150, label: 'To the Dock', action: { type: 'room', room: 'dock' } },
    { x: 1170, y: 560, w: 90, h: 150, label: 'To the Plaza', action: { type: 'room', room: 'plaza' } },
    { x: 392, y: 452, w: 116, h: 92, label: 'Ski Hill', action: { type: 'room', room: 'ski-hill' } },
  ],
  paint(ctx, t) {
    sky(ctx, '#8fc7f0', '#dff0fb')
    mountains(ctx, 470, 210, '#b9d4ea', 3, 6)
    mountains(ctx, 490, 140, '#cfe4f3', 11, 8)
    snowGround(ctx, 470)

    // Path to the ski hill, running up between the coffee and gift shops.
    ctx.fillStyle = withAlpha('#c3daf0', 0.85)
    ctx.beginPath()
    ctx.moveTo(418, 452)
    ctx.lineTo(482, 452)
    ctx.lineTo(560, 700)
    ctx.lineTo(340, 700)
    ctx.closePath()
    ctx.fill()

    building(ctx, { x: 250, y: 510, w: 250, h: 170, wall: '#c98a5b', roof: '#8c4f3a', label: 'Coffee Shop', labelColor: '#7a4030', lit: true })
    building(ctx, { x: 640, y: 510, w: 260, h: 180, wall: '#7bb7d8', roof: '#2f6f9e', label: 'Gift Shop', labelColor: '#2b6183', lit: true })
    building(ctx, { x: 1030, y: 510, w: 250, h: 170, wall: '#9d7fc4', roof: '#5c3f8c', label: 'Dance Club', labelColor: '#4d3579', lit: true })

    lamppost(ctx, 840, 560, true)
    snowMound(ctx, 140, 620, 70, 26)
    snowMound(ctx, 1160, 650, 90, 30)
    pineTree(ctx, 60, 560, 0.85)
    pineTree(ctx, 1235, 590, 1)

    sign(ctx, 100, 600, '← Dock', '#2f6f9e')
    sign(ctx, 1180, 600, 'Plaza →', '#2f6f9e')
    sign(ctx, 450, 448, '↑ Ski Hill', '#4c6b8a')

    snowfall(ctx, t, 60, 0.7)
  },
}

// ---------------------------------------------------------------------------
// Plaza
// ---------------------------------------------------------------------------

const plaza: Room = {
  id: 'plaza',
  name: 'Snowy Plaza',
  walk: { x1: 70, y1: 520, x2: 1210, y2: 690 },
  spawn: { x: 200, y: 620 },
  hotspots: [
    { x: 20, y: 550, w: 90, h: 150, label: 'To Town', action: { type: 'room', room: 'town' } },
    { x: 946, y: 420, w: 108, h: 92, label: 'Adopt a Puffle', action: { type: 'puffles' } },
  ],
  paint(ctx, t) {
    sky(ctx, '#7fbdea', '#d8ecfa')
    mountains(ctx, 460, 170, '#c2daee', 21, 7)
    snowGround(ctx, 460)

    // Cobbled plaza circle.
    ctx.fillStyle = withAlpha('#cbdcec', 0.85)
    ctx.beginPath()
    ctx.ellipse(660, 620, 400, 120, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = withAlpha('#a9c3da', 0.7)
    ctx.lineWidth = 2
    for (let i = 0; i < 40; i++) {
      const a = rnd(i * 3.7) * Math.PI * 2
      const r = 0.35 + rnd(i * 5.1) * 0.62
      const x = 660 + Math.cos(a) * 400 * r
      const y = 620 + Math.sin(a) * 120 * r
      ctx.beginPath()
      ctx.ellipse(x, y, 16, 6, 0, 0, Math.PI * 2)
      ctx.stroke()
    }

    building(ctx, { x: 300, y: 500, w: 250, h: 160, wall: '#e0a25b', roof: '#b05e35', label: 'Pizza Place', labelColor: '#9c5230', lit: true })
    building(ctx, { x: 1000, y: 500, w: 240, h: 155, wall: '#84c9a4', roof: '#3d8a63', label: 'Snow Pets', labelColor: '#357a57', lit: true })

    // Fountain, frozen over.
    ctx.fillStyle = '#b9cfe4'
    ctx.beginPath()
    ctx.ellipse(660, 560, 92, 32, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#8fd0ea'
    ctx.beginPath()
    ctx.ellipse(660, 556, 76, 24, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#e8f4fb'
    ctx.beginPath()
    ctx.ellipse(660, 552, 22, 8, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#cfe3f2'
    ctx.fillRect(652, 500, 16, 54)
    ctx.beginPath()
    ctx.ellipse(660, 500, 34, 11, 0, 0, Math.PI * 2)
    ctx.fill()
    // Icicles.
    ctx.fillStyle = withAlpha('#ffffff', 0.85)
    for (let i = 0; i < 7; i++) {
      const x = 632 + i * 9
      const h = 8 + rnd(i * 2.3) * 12
      ctx.beginPath()
      ctx.moveTo(x - 3, 508)
      ctx.lineTo(x + 3, 508)
      ctx.lineTo(x, 508 + h)
      ctx.closePath()
      ctx.fill()
    }

    lamppost(ctx, 500, 560)
    lamppost(ctx, 830, 560)
    pineTree(ctx, 120, 540, 0.9)
    pineTree(ctx, 1210, 560, 0.8)
    sign(ctx, 90, 590, '← Town', '#2f6f9e')

    snowfall(ctx, t, 50, 0.6)
  },
}

// ---------------------------------------------------------------------------
// Dock — ice fishing
// ---------------------------------------------------------------------------

const dock: Room = {
  id: 'dock',
  name: 'The Dock',
  walk: { x1: 80, y1: 540, x2: 1200, y2: 690 },
  spawn: { x: 1080, y: 620 },
  hotspots: [
    { x: 1160, y: 550, w: 100, h: 150, label: 'To Town', action: { type: 'room', room: 'town' } },
    { x: 300, y: 470, w: 190, h: 130, label: 'Ice Fishing', action: { type: 'game', game: 'fishing' } },
  ],
  paint(ctx, t) {
    sky(ctx, '#6fb2e4', '#cfe8f8')
    mountains(ctx, 430, 150, '#b6d3ea', 31, 6)
    water(ctx, 0, 430, WORLD_W, 130, t)
    snowGround(ctx, 545, '#e4f1fb')

    // Wooden jetty running out over the water.
    ctx.fillStyle = '#a8794b'
    ctx.beginPath()
    ctx.moveTo(220, 560)
    ctx.lineTo(560, 560)
    ctx.lineTo(600, 470)
    ctx.lineTo(250, 470)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = withAlpha('#000000', 0.16)
    ctx.lineWidth = 2
    for (let i = 0; i <= 8; i++) {
      const k = i / 8
      ctx.beginPath()
      ctx.moveTo(220 + (250 - 220) * k, 560 - (560 - 470) * k)
      ctx.lineTo(560 + (600 - 560) * k, 560 - (560 - 470) * k)
      ctx.stroke()
    }
    ctx.fillStyle = '#8a6038'
    for (const px of [250, 380, 520]) {
      ctx.fillRect(px, 550, 10, 26)
    }

    // Fishing hole at the end of the jetty.
    ctx.fillStyle = '#1d6ba3'
    ctx.beginPath()
    ctx.ellipse(400, 500, 44, 16, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#e8f4fb'
    ctx.lineWidth = 4
    ctx.stroke()
    ctx.fillStyle = withAlpha('#ffffff', 0.3)
    ctx.beginPath()
    ctx.ellipse(392, 497, 16, 5, -0.3, 0, Math.PI * 2)
    ctx.fill()
    sign(ctx, 400, 460, 'Ice Fishing', '#1d6ba3')

    // A little moored boat.
    ctx.fillStyle = '#d05a4a'
    ctx.beginPath()
    ctx.moveTo(820, 500)
    ctx.quadraticCurveTo(900, 540, 980, 500)
    ctx.lineTo(960, 486)
    ctx.lineTo(840, 486)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#7a5433'
    ctx.fillRect(886, 424, 6, 64)
    ctx.fillStyle = '#f4f7f9'
    ctx.strokeStyle = '#b9cfe0'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(892, 428)
    ctx.lineTo(944, 458)
    ctx.lineTo(892, 480)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Crates and a coil of rope.
    ctx.fillStyle = '#b98a54'
    ctx.fillRect(1040, 560, 54, 46)
    ctx.fillRect(1096, 578, 44, 38)
    ctx.strokeStyle = '#8a6038'
    ctx.lineWidth = 3
    ctx.strokeRect(1040, 560, 54, 46)
    ctx.strokeRect(1096, 578, 44, 38)

    sign(ctx, 1190, 590, 'Town →', '#2f6f9e')
    snowfall(ctx, t, 45, 0.55)
  },
}

// ---------------------------------------------------------------------------
// Ski hill — sled rush
// ---------------------------------------------------------------------------

const skiHill: Room = {
  id: 'ski-hill',
  name: 'Ski Hill',
  walk: { x1: 90, y1: 540, x2: 1190, y2: 690 },
  spawn: { x: 640, y: 640 },
  hotspots: [
    { x: 20, y: 560, w: 100, h: 140, label: 'To Town', action: { type: 'room', room: 'town' } },
    { x: 760, y: 440, w: 200, h: 160, label: 'Sled Rush', action: { type: 'game', game: 'sled' } },
  ],
  paint(ctx, t) {
    sky(ctx, '#79b9e8', '#e3f2fc')
    mountains(ctx, 420, 260, '#a9c9e4', 41, 5)
    mountains(ctx, 470, 170, '#c6ddf0', 52, 7)
    snowGround(ctx, 470)

    // The run itself, banked with snow walls.
    ctx.fillStyle = withAlpha('#ffffff', 0.9)
    ctx.beginPath()
    ctx.moveTo(800, 440)
    ctx.lineTo(920, 440)
    ctx.lineTo(1010, 700)
    ctx.lineTo(720, 700)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = withAlpha('#a9c9e4', 0.8)
    ctx.lineWidth = 3
    ctx.stroke()

    // Chair lift.
    ctx.strokeStyle = '#5a6b7d'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(160, 470)
    ctx.lineTo(620, 300)
    ctx.stroke()
    for (const k of [0.15, 0.42, 0.72]) {
      const cx = 160 + (620 - 160) * k
      const cy = 470 - (470 - 300) * k + Math.sin(t + k * 6) * 2
      ctx.strokeStyle = '#5a6b7d'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx, cy + 16)
      ctx.stroke()
      ctx.fillStyle = '#e2574c'
      ctx.beginPath()
      ctx.roundRect(cx - 11, cy + 16, 22, 14, 3)
      ctx.fill()
    }
    for (const px of [200, 420, 610]) {
      const py = 470 - ((px - 160) / 460) * 170
      ctx.fillStyle = '#5a6b7d'
      ctx.fillRect(px - 3, py, 6, 90)
    }

    pineTree(ctx, 150, 620, 1.1)
    pineTree(ctx, 300, 560, 0.8)
    pineTree(ctx, 1180, 600, 1)
    pineTree(ctx, 1080, 540, 0.7)
    snowMound(ctx, 520, 660, 90, 28)

    // Sled parked at the top of the run.
    ctx.fillStyle = withAlpha('#0b1b33', 0.12)
    ctx.beginPath()
    ctx.ellipse(864, 590, 46, 8, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#8a6038'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(828, 584)
    ctx.quadraticCurveTo(902, 588, 906, 566)
    ctx.stroke()
    ctx.lineCap = 'butt'
    ctx.fillStyle = '#8a6038'
    ctx.fillRect(838, 570, 6, 14)
    ctx.fillRect(884, 570, 6, 14)
    ctx.fillStyle = '#c0392b'
    ctx.beginPath()
    ctx.roundRect(826, 556, 74, 18, 6)
    ctx.fill()
    ctx.fillStyle = '#8e2b20'
    ctx.beginPath()
    ctx.roundRect(826, 568, 74, 6, 3)
    ctx.fill()
    sign(ctx, 860, 516, 'Sled Rush', '#c0392b')

    sign(ctx, 90, 600, '← Town', '#2f6f9e')
    snowfall(ctx, t, 90, 0.85)
  },
}

// ---------------------------------------------------------------------------
// Gift shop — clothing
// ---------------------------------------------------------------------------

const giftShop: Room = {
  id: 'gift-shop',
  name: 'Gift Shop',
  indoor: true,
  walk: { x1: 120, y1: 540, x2: 1160, y2: 680 },
  spawn: { x: 640, y: 640 },
  hotspots: [
    { x: 60, y: 400, w: 130, h: 200, label: 'Back to Town', action: { type: 'room', room: 'town' } },
    { x: 520, y: 380, w: 240, h: 180, label: 'Browse Clothes', action: { type: 'shop' } },
  ],
  paint(ctx, t) {
    interiorWall(ctx, 520, '#bfe0f2', '#8dbedd')
    woodFloor(ctx, 520, '#c79a63')

    // Exit door.
    ctx.fillStyle = '#5b4130'
    ctx.beginPath()
    ctx.roundRect(70, 330, 110, 190, [10, 10, 0, 0])
    ctx.fill()
    ctx.fillStyle = '#8fd0ea'
    ctx.beginPath()
    ctx.roundRect(84, 348, 82, 90, 6)
    ctx.fill()
    ctx.fillStyle = '#f0c14b'
    ctx.beginPath()
    ctx.arc(164, 440, 4, 0, Math.PI * 2)
    ctx.fill()
    sign(ctx, 125, 300, '← Town', '#2f6f9e')

    // Shop counter.
    ctx.fillStyle = '#9c6b3f'
    ctx.beginPath()
    ctx.roundRect(520, 430, 240, 110, 8)
    ctx.fill()
    ctx.fillStyle = '#b98a54'
    ctx.beginPath()
    ctx.roundRect(510, 418, 260, 24, 8)
    ctx.fill()
    ctx.fillStyle = '#f4e5c8'
    ctx.font = '700 22px ui-rounded, "Segoe UI", system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('CLOTHES', 640, 486)

    // Clothing racks either side.
    for (const rx of [300, 980]) {
      ctx.strokeStyle = '#7d8896'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(rx - 90, 400)
      ctx.lineTo(rx + 90, 400)
      ctx.moveTo(rx, 400)
      ctx.lineTo(rx, 520)
      ctx.stroke()
      const colors = ['#e2574c', '#f3c73f', '#4ba3d8', '#7fbf7f', '#b07fd8']
      for (let i = 0; i < 5; i++) {
        const x = rx - 72 + i * 36
        ctx.fillStyle = colors[i]
        ctx.beginPath()
        ctx.moveTo(x, 404)
        ctx.lineTo(x + 15, 430)
        ctx.lineTo(x + 11, 484)
        ctx.lineTo(x - 11, 484)
        ctx.lineTo(x - 15, 430)
        ctx.closePath()
        ctx.fill()
      }
    }

    // Mirror with a slow shimmer.
    ctx.fillStyle = '#d8b06a'
    ctx.beginPath()
    ctx.roundRect(1080, 300, 110, 190, 12)
    ctx.fill()
    ctx.fillStyle = '#dceefa'
    ctx.beginPath()
    ctx.roundRect(1092, 312, 86, 166, 8)
    ctx.fill()
    ctx.fillStyle = withAlpha('#ffffff', 0.55)
    ctx.beginPath()
    ctx.moveTo(1100 + Math.sin(t * 0.5) * 10, 312)
    ctx.lineTo(1130 + Math.sin(t * 0.5) * 10, 312)
    ctx.lineTo(1104 + Math.sin(t * 0.5) * 10, 478)
    ctx.lineTo(1092 + Math.sin(t * 0.5) * 10, 478)
    ctx.closePath()
    ctx.fill()

    // Bunting.
    const flagColors = ['#e2574c', '#f3c73f', '#4ba3d8', '#7fbf7f', '#b07fd8']
    for (let i = 0; i < 22; i++) {
      const x = 40 + i * 56
      const y = 40 + Math.sin(i * 0.6) * 12
      ctx.fillStyle = flagColors[i % flagColors.length]
      ctx.beginPath()
      ctx.moveTo(x - 14, y)
      ctx.lineTo(x + 14, y)
      ctx.lineTo(x, y + 26)
      ctx.closePath()
      ctx.fill()
    }
  },
}

// ---------------------------------------------------------------------------
// Coffee shop — bag catching game
// ---------------------------------------------------------------------------

const coffeeShop: Room = {
  id: 'coffee-shop',
  name: 'Coffee Shop',
  indoor: true,
  walk: { x1: 120, y1: 545, x2: 1160, y2: 680 },
  spawn: { x: 640, y: 640 },
  hotspots: [
    { x: 60, y: 400, w: 130, h: 200, label: 'Back to Town', action: { type: 'room', room: 'town' } },
    { x: 700, y: 380, w: 260, h: 180, label: 'Coffee Rush', action: { type: 'game', game: 'coffee' } },
  ],
  paint(ctx, t) {
    interiorWall(ctx, 530, '#e6c9a4', '#c99f72')
    woodFloor(ctx, 530, '#8f5f37')

    ctx.fillStyle = '#5b4130'
    ctx.beginPath()
    ctx.roundRect(70, 330, 110, 200, [10, 10, 0, 0])
    ctx.fill()
    ctx.fillStyle = '#8fd0ea'
    ctx.beginPath()
    ctx.roundRect(84, 348, 82, 90, 6)
    ctx.fill()
    sign(ctx, 125, 300, '← Town', '#2f6f9e')

    // Barista counter.
    ctx.fillStyle = '#7a4a28'
    ctx.beginPath()
    ctx.roundRect(700, 420, 270, 120, 8)
    ctx.fill()
    ctx.fillStyle = '#a06a3c'
    ctx.beginPath()
    ctx.roundRect(690, 406, 290, 24, 8)
    ctx.fill()
    // Espresso machine.
    ctx.fillStyle = '#c9ccd1'
    ctx.beginPath()
    ctx.roundRect(880, 330, 90, 78, 6)
    ctx.fill()
    ctx.fillStyle = '#4a5058'
    ctx.fillRect(896, 372, 58, 12)
    ctx.fillStyle = '#e2574c'
    ctx.beginPath()
    ctx.arc(900, 350, 6, 0, Math.PI * 2)
    ctx.fill()
    // Steam.
    ctx.strokeStyle = withAlpha('#ffffff', 0.45)
    ctx.lineWidth = 4
    for (let i = 0; i < 3; i++) {
      const x = 910 + i * 16
      ctx.beginPath()
      ctx.moveTo(x, 326)
      ctx.quadraticCurveTo(x + Math.sin(t * 2 + i) * 10, 300, x, 274)
      ctx.stroke()
    }

    // Sacks of beans.
    for (const [bx, by, s] of [[720, 500, 1], [770, 512, 0.8], [660, 520, 0.9]] as const) {
      ctx.fillStyle = '#b6884f'
      ctx.beginPath()
      ctx.ellipse(bx, by, 28 * s, 22 * s, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#8f6738'
      ctx.beginPath()
      ctx.ellipse(bx, by - 18 * s, 12 * s, 6 * s, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    // Tables.
    for (const tx of [300, 480]) {
      ctx.fillStyle = '#6b4a30'
      ctx.fillRect(tx - 5, 470, 10, 60)
      ctx.fillStyle = '#a9743f'
      ctx.beginPath()
      ctx.ellipse(tx, 468, 56, 18, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#f4f7f9'
      ctx.beginPath()
      ctx.roundRect(tx - 12, 448, 20, 16, 3)
      ctx.fill()
      ctx.strokeStyle = '#f4f7f9'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(tx + 12, 456, 6, -Math.PI / 2, Math.PI / 2)
      ctx.stroke()
    }

    sign(ctx, 835, 380, 'Coffee Rush', '#7a4a28')

    // Warm hanging lamps.
    for (const lx of [340, 640, 940]) {
      ctx.strokeStyle = '#5b4130'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(lx, 0)
      ctx.lineTo(lx, 90)
      ctx.stroke()
      ctx.fillStyle = '#e8b04b'
      ctx.beginPath()
      ctx.moveTo(lx - 30, 128)
      ctx.lineTo(lx + 30, 128)
      ctx.lineTo(lx + 12, 90)
      ctx.lineTo(lx - 12, 90)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = withAlpha('#ffe9a8', 0.16)
      ctx.beginPath()
      ctx.arc(lx, 140, 70, 0, Math.PI * 2)
      ctx.fill()
    }
  },
}

// ---------------------------------------------------------------------------
// Dance club
// ---------------------------------------------------------------------------

const nightClub: Room = {
  id: 'night-club',
  name: 'Dance Club',
  indoor: true,
  walk: { x1: 140, y1: 540, x2: 1140, y2: 680 },
  spawn: { x: 640, y: 620 },
  hotspots: [
    { x: 60, y: 400, w: 130, h: 200, label: 'Back to Town', action: { type: 'room', room: 'town' } },
  ],
  paint(ctx, t) {
    ctx.fillStyle = '#1a1030'
    ctx.fillRect(0, 0, WORLD_W, WORLD_H)

    // Coloured light cones sweeping the room.
    const beams = ['#ff5f7e', '#38bdf8', '#a78bfa', '#4ade80']
    for (let i = 0; i < 4; i++) {
      const a = Math.sin(t * 0.8 + i * 1.6) * 0.5
      ctx.save()
      ctx.translate(260 + i * 260, 40)
      ctx.rotate(a)
      const g = ctx.createLinearGradient(0, 0, 0, 520)
      g.addColorStop(0, withAlpha(beams[i], 0.4))
      g.addColorStop(1, withAlpha(beams[i], 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(-130, 520)
      ctx.lineTo(130, 520)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }

    ctx.fillStyle = '#2b1c4d'
    ctx.fillRect(0, 500, WORLD_W, 40)
    ctx.fillStyle = '#241741'
    ctx.fillRect(0, 540, WORLD_W, WORLD_H - 540)

    danceFloor(ctx, 220, 540, 840, 170, t)

    // Disco ball.
    ctx.strokeStyle = '#6b7280'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(640, 0)
    ctx.lineTo(640, 60)
    ctx.stroke()
    const bob = Math.sin(t * 1.2) * 4
    ctx.fillStyle = '#c9d3dd'
    ctx.beginPath()
    ctx.arc(640, 96 + bob, 34, 0, Math.PI * 2)
    ctx.fill()
    for (let i = 0; i < 26; i++) {
      const a = rnd(i * 4.2) * Math.PI * 2
      const r = rnd(i * 6.6) * 30
      ctx.fillStyle = withAlpha(beams[i % 4], 0.5 + Math.sin(t * 3 + i) * 0.3)
      ctx.fillRect(640 + Math.cos(a) * r - 3, 96 + bob + Math.sin(a) * r - 3, 7, 7)
    }

    // Speakers.
    for (const sx of [272, 1010]) {
      const thump = 1 + Math.sin(t * 6) * 0.04
      ctx.save()
      ctx.translate(sx, 500)
      ctx.scale(thump, thump)
      ctx.fillStyle = '#332248'
      ctx.beginPath()
      ctx.roundRect(-52, -220, 104, 220, 8)
      ctx.fill()
      ctx.fillStyle = '#1c1230'
      ctx.beginPath()
      ctx.arc(0, -160, 32, 0, Math.PI * 2)
      ctx.fill()
      ctx.arc(0, -60, 22, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#4b3a66'
      ctx.beginPath()
      ctx.arc(0, -160, 12, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // Exit.
    ctx.fillStyle = '#3b2a5c'
    ctx.beginPath()
    ctx.roundRect(70, 320, 110, 200, [10, 10, 0, 0])
    ctx.fill()
    ctx.fillStyle = withAlpha('#8fd0ea', 0.6)
    ctx.beginPath()
    ctx.roundRect(84, 338, 82, 90, 6)
    ctx.fill()
    sign(ctx, 125, 292, '← Town', '#5c3f8c')

    ctx.font = '800 30px ui-rounded, "Segoe UI", system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = withAlpha('#ffffff', 0.8 + Math.sin(t * 4) * 0.2)
    ctx.fillText('press  D  to dance', 640, 250)
  },
}

// ---------------------------------------------------------------------------

export const ROOMS: Record<RoomId, Room> = {
  town,
  plaza,
  dock,
  'ski-hill': skiHill,
  'gift-shop': giftShop,
  'coffee-shop': coffeeShop,
  'night-club': nightClub,
}

export const ROOM_IDS = Object.keys(ROOMS) as RoomId[]

/** Rooms the map lets you jump straight to. */
export const MAP_ROOMS: Array<{ id: RoomId; blurb: string }> = [
  { id: 'town', blurb: 'Shops and the way everywhere else' },
  { id: 'plaza', blurb: 'Pizza, pet shop and the fountain' },
  { id: 'dock', blurb: 'Boats, crates and ice fishing' },
  { id: 'ski-hill', blurb: 'Chair lift and the sled run' },
  { id: 'gift-shop', blurb: 'Clothes and colours' },
  { id: 'coffee-shop', blurb: 'Warm drinks and Coffee Rush' },
  { id: 'night-club', blurb: 'Lights, speakers, dancing' },
]

/**
 * Builds a Room for somebody's igloo. Furniture is returned as `props` so the
 * renderer can depth-sort it against the penguins standing in the room.
 */
export function buildIglooRoom(data: IglooData): Room {
  const style = IGLOO_STYLES_BY_ID[data.style] ?? IGLOO_STYLES[0]
  const floorY = style.floorY

  return {
    id: iglooRoomId(data.owner),
    name: `${data.ownerName}'s Igloo`,
    indoor: true,
    iglooOwner: data.owner,
    props: data.items,
    walk: { x1: 110, y1: floorY + 70, x2: WORLD_W - 110, y2: 690 },
    spawn: { x: 240, y: floorY + 150 },
    hotspots: [
      { x: 60, y: floorY - 190, w: 130, h: 210, label: 'Leave', action: { type: 'room', room: 'town' } },
    ],
    paint(ctx, t) {
      style.paint(ctx, t, WORLD_W, WORLD_H)

      // Front door.
      const doorTop = floorY - 190
      ctx.fillStyle = '#5b4130'
      ctx.beginPath()
      ctx.roundRect(60, doorTop, 130, 210, [16, 16, 0, 0])
      ctx.fill()
      ctx.fillStyle = '#8fd0ea'
      ctx.beginPath()
      ctx.roundRect(78, doorTop + 20, 94, 96, 8)
      ctx.fill()
      ctx.fillStyle = withAlpha('#ffffff', 0.35)
      ctx.beginPath()
      ctx.moveTo(86, doorTop + 112)
      ctx.lineTo(120, doorTop + 30)
      ctx.lineTo(136, doorTop + 30)
      ctx.lineTo(102, doorTop + 112)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#f0c14b'
      ctx.beginPath()
      ctx.arc(172, doorTop + 150, 5, 0, Math.PI * 2)
      ctx.fill()
      sign(ctx, 125, doorTop - 34, '← Town', '#2f6f9e')

      // Welcome mat.
      ctx.fillStyle = withAlpha('#b8524f', 0.85)
      ctx.beginPath()
      ctx.ellipse(125, floorY + 46, 76, 22, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = withAlpha('#f4e5c8', 0.9)
      ctx.font = '700 15px ui-rounded, "Segoe UI", system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('WELCOME', 125, floorY + 46)
    },
  }
}

/** Placeholder shown for the moment before an igloo's contents arrive. */
export function loadingIglooRoom(name: string): Room {
  return {
    id: 'igloo:loading',
    name,
    indoor: true,
    walk: { x1: 300, y1: 560, x2: 980, y2: 660 },
    spawn: { x: 640, y: 620 },
    hotspots: [],
    paint(ctx) {
      ctx.fillStyle = '#8fc0e0'
      ctx.fillRect(0, 0, WORLD_W, WORLD_H)
      ctx.fillStyle = '#e8f3fb'
      ctx.fillRect(0, 470, WORLD_W, WORLD_H - 470)
      ctx.font = '700 28px ui-rounded, "Segoe UI", system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = withAlpha('#0d1f38', 0.5)
      ctx.fillText('Opening the door…', WORLD_W / 2, 360)
    },
  }
}

export function clampToWalk(room: Room, x: number, y: number) {
  return {
    x: Math.max(room.walk.x1, Math.min(room.walk.x2, x)),
    y: Math.max(room.walk.y1, Math.min(room.walk.y2, y)),
  }
}

/** Highlight ring shown when the cursor is over a door or game. */
export function drawHotspot(ctx: CanvasRenderingContext2D, h: Hotspot, t: number) {
  const pulse = 0.5 + Math.sin(t * 3) * 0.18
  ctx.save()
  ctx.fillStyle = withAlpha('#ffffff', 0.16 * pulse + 0.08)
  ctx.strokeStyle = withAlpha('#ffffff', 0.85)
  ctx.lineWidth = 3
  ctx.setLineDash([9, 7])
  ctx.lineDashOffset = -t * 22
  ctx.beginPath()
  ctx.roundRect(h.x, h.y, h.w, h.h, 12)
  ctx.fill()
  ctx.stroke()
  ctx.setLineDash([])

  ctx.font = '700 16px ui-rounded, "Segoe UI", system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const tw = ctx.measureText(h.label).width + 22
  const lx = Math.max(tw / 2 + 6, Math.min(WORLD_W - tw / 2 - 6, h.x + h.w / 2))
  const ly = Math.max(22, h.y - 18)
  ctx.fillStyle = mix('#0d1f38', '#1c6fd0', 0.25)
  ctx.beginPath()
  ctx.roundRect(lx - tw / 2, ly - 15, tw, 30, 8)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.fillText(h.label, lx, ly)
  ctx.restore()
}

/** Small decorative penguin-free vignette used behind the login screen. */
export function paintTitleScene(ctx: CanvasRenderingContext2D, t: number) {
  sky(ctx, '#123a5e', '#2f6f9e')
  stars(ctx, t, 70, 420)
  moon(ctx, 1080, 120, 46)
  mountains(ctx, 500, 230, shade('#1d3b63', 0), 7, 6)
  mountains(ctx, 540, 150, shade('#2b5182', 0), 17, 8)
  snowGround(ctx, 540, '#cfe0f2')
  pineTree(ctx, 140, 620, 1.2)
  pineTree(ctx, 300, 580, 0.8)
  pineTree(ctx, 1120, 640, 1.1)
  lamppost(ctx, 640, 640, true)
  snowfall(ctx, t, 90, 0.8)
}
