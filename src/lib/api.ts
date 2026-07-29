import type { Equipped, FriendSummary, GameId, IglooData, Profile } from './types'

/**
 * Every call to our own /api routes. The session lives in an HttpOnly cookie,
 * so requests just need `credentials: 'same-origin'` and never carry a user id.
 */
async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  })
  const text = await res.text()
  const data = text ? (JSON.parse(text) as T & { error?: string }) : ({} as T & { error?: string })
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong.')
  return data
}

const post = <T>(path: string, body: unknown) =>
  call<T>(path, { method: 'POST', body: JSON.stringify(body) })

// --- session ---------------------------------------------------------------

export interface Me {
  userId: string | null
  profile: Profile | null
  inventory: string[]
}

export const getMe = () => call<Me>('/api/auth')

export const signUp = (email: string, password: string) =>
  post<Me>('/api/auth', { action: 'signup', email, password })

export const logIn = (email: string, password: string) =>
  post<Me>('/api/auth', { action: 'login', email, password })

export const logOut = () => post<{ ok: true }>('/api/auth', { action: 'logout' })

// --- penguin ---------------------------------------------------------------

export const createPenguin = (username: string, color: string) =>
  post<{ ok: true }>('/api/penguin', { username, color })

export const updateLooks = (patch: {
  color?: string
  equipped?: Equipped
  puffleNames?: Record<string, string>
}) => call<{ ok: true }>('/api/penguin', { method: 'PATCH', body: JSON.stringify(patch) })

// --- coins -----------------------------------------------------------------

export const buyItem = (item: string) =>
  post<{ coins: number }>('/api/coins', { action: 'buy', item })

export const awardCoins = (game: GameId, score: number) =>
  post<{ coins: number }>('/api/coins', { action: 'award', game, score })

// --- friends ---------------------------------------------------------------

export const getFriends = () =>
  call<{ friends: FriendSummary[]; requests: FriendSummary[] }>('/api/friends')

export const friendAction = (action: 'request' | 'accept' | 'decline' | 'remove', id: string) =>
  post<{ ok?: true; result?: string }>('/api/friends', { action, id })

// --- igloos ----------------------------------------------------------------

export const getIgloo = (owner: string) =>
  call<IglooData>(`/api/igloo?owner=${encodeURIComponent(owner)}`)

export const saveIgloo = (style: string, items: IglooData['items']) =>
  post<{ ok: true }>('/api/igloo', { style, items })

// --- multiplayer -----------------------------------------------------------

export interface RoomPlayer {
  id: string
  username: string
  color: string
  equipped: Equipped
  x: number
  y: number
  tx: number
  ty: number
  dir: 1 | -1
}

export interface RoomEvent {
  id: number
  from: string
  kind: 'move' | 'chat' | 'emote' | 'snowball'
  payload: Record<string, unknown> & { id: string; name: string }
}

export interface SyncResult {
  players: RoomPlayer[]
  events: RoomEvent[]
  lastId: number
}

export interface OutgoingEvent {
  kind: 'move' | 'chat' | 'emote' | 'snowball'
  payload: Record<string, unknown>
}

export const roomSync = (body: {
  roomId: string
  roomName: string
  x: number
  y: number
  tx: number
  ty: number
  dir: 1 | -1
  /** Highest event id already seen; -1 on the first poll to skip the backlog. */
  since: number
  events: OutgoingEvent[]
}) => post<SyncResult>('/api/room', body)

export interface IslandRow {
  id: string
  username: string
  color: string
  equipped: Equipped
  room: string
  roomName: string
}

export const islandOnline = () => call<{ online: IslandRow[] }>('/api/room')
