/** Slots that change how the penguin itself is drawn. */
export type WearSlot = 'hat' | 'shirt' | 'neck' | 'hand' | 'feet'

/** Wearables plus the puffle currently walking with you. */
export type Slot = WearSlot | 'puffle'

export type Equipped = Partial<Record<Slot, string>>

export interface Profile {
  id: string
  username: string
  color: string
  coins: number
  equipped: Equipped
  /** Nicknames the player gave their puffles, keyed by puffle item id. */
  puffleNames: Record<string, string>
}

export interface IglooData {
  owner: string
  ownerName: string
  style: string
  items: Array<{ item: string; x: number; y: number }>
}

export interface FriendSummary {
  id: string
  username: string
  color: string
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
  /** Trailing puffle position, interpolated locally. */
  puffleX: number
  puffleY: number
  puffleHop: number
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
