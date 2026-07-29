export type Slot = 'hat' | 'shirt' | 'neck' | 'hand' | 'feet'

export type Equipped = Partial<Record<Slot, string>>

export interface Profile {
  id: string
  username: string
  color: string
  coins: number
  equipped: Equipped
}

/** What every client broadcasts about itself. */
export interface PlayerState {
  id: string
  username: string
  color: string
  equipped: Equipped
  /** Current interpolated position. */
  x: number
  y: number
  /** Where the penguin is waddling to. */
  tx: number
  ty: number
  dir: 1 | -1
  /** Emote name + when it started, or null. */
  emote: string | null
  emoteAt: number
  bubble: string | null
  bubbleAt: number
}

export interface Snowball {
  id: number
  fromX: number
  fromY: number
  toX: number
  toY: number
  start: number
}

export type GameId = 'sled' | 'fishing' | 'coffee'
