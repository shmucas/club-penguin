import { useCallback, useEffect, useMemo, useState } from 'react'
import * as api from './lib/api'
import type { Equipped, FriendSummary, GameId, Profile, Slot } from './lib/types'
import { Auth } from './components/Auth'
import { CreatePenguin } from './components/CreatePenguin'
import { World } from './components/World'
import { Setup } from './components/Setup'

export function App() {
  const [userId, setUserId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  /** Set when /api/auth itself fails, which means the server is misconfigured. */
  const [broken, setBroken] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [inventory, setInventory] = useState<Set<string>>(new Set())
  const [friends, setFriends] = useState<FriendSummary[]>([])
  const [requests, setRequests] = useState<FriendSummary[]>([])

  const refreshFriends = useCallback(async () => {
    const { friends: mine, requests: pending } = await api.getFriends()
    const shape = (rows: FriendSummary[]): FriendSummary[] =>
      rows.map((r) => ({ ...r, equipped: (r.equipped ?? {}) as Equipped }))
    setFriends(shape(mine))
    setRequests(shape(pending))
  }, [])

  /** Adopt a session response: penguin, inventory and friends in one go. */
  const adopt = useCallback(
    (me: api.Me) => {
      setUserId(me.userId)
      setProfile(me.profile)
      setInventory(new Set(me.inventory))
      if (!me.userId) {
        setFriends([])
        setRequests([])
      } else if (me.profile) {
        void refreshFriends()
      }
    },
    [refreshFriends],
  )

  useEffect(() => {
    api
      .getMe()
      .then(adopt)
      .catch(() => setBroken(true))
      .finally(() => setReady(true))
  }, [adopt])

  const reload = useCallback(async () => {
    adopt(await api.getMe())
  }, [adopt])

  const signOut = useCallback(async () => {
    await api.logOut()
    setUserId(null)
    setProfile(null)
    setInventory(new Set())
    setFriends([])
    setRequests([])
  }, [])

  /** Buy an item through the API, then reflect the new balance locally. */
  const buyItem = useCallback(async (itemId: string) => {
    const { coins } = await api.buyItem(itemId)
    setProfile((p) => (p ? { ...p, coins } : p))
    setInventory((inv) => new Set(inv).add(itemId))
  }, [])

  const equip = useCallback(async (slot: Slot | 'color', itemId: string | null) => {
    let next: Profile | null = null
    setProfile((p) => {
      if (!p) return p
      if (slot === 'color') {
        next = { ...p, color: itemId ?? p.color }
      } else {
        const equipped: Equipped = { ...p.equipped }
        if (itemId) equipped[slot] = itemId
        else delete equipped[slot]
        next = { ...p, equipped }
      }
      return next
    })
    if (!next) return
    const target = next as Profile
    await api.updateLooks({ color: target.color, equipped: target.equipped })
  }, [])

  /** Give a puffle a nickname. Stored on the profile as a plain JSON map. */
  const renamePuffle = useCallback(async (puffleId: string, name: string) => {
    let next: Record<string, string> = {}
    setProfile((p) => {
      if (!p) return p
      next = { ...p.puffleNames, [puffleId]: name.trim().slice(0, 16) }
      return { ...p, puffleNames: next }
    })
    await api.updateLooks({ puffleNames: next })
  }, [])

  const friendAction = useCallback(
    (action: 'request' | 'accept' | 'decline' | 'remove') => async (id: string) => {
      await api.friendAction(action, id)
      await refreshFriends()
    },
    [refreshFriends],
  )

  const addFriend = useMemo(() => friendAction('request'), [friendAction])
  const acceptFriend = useMemo(() => friendAction('accept'), [friendAction])
  const declineFriend = useMemo(() => friendAction('decline'), [friendAction])
  const removeFriend = useMemo(() => friendAction('remove'), [friendAction])

  const awardCoins = useCallback(async (game: GameId, score: number) => {
    const { coins } = await api.awardCoins(game, score)
    setProfile((p) => (p ? { ...p, coins } : p))
    return coins
  }, [])

  const content = useMemo(() => {
    if (broken) return <Setup />
    if (!ready) return <Splash label="Warming up the island…" />
    if (!userId) return <Auth onAuthed={adopt} />
    if (!profile) {
      return <CreatePenguin onCreated={reload} onSignOut={signOut} />
    }
    return (
      <World
        profile={profile}
        inventory={inventory}
        friends={friends}
        requests={requests}
        onBuy={buyItem}
        onEquip={equip}
        onAward={awardCoins}
        onRenamePuffle={renamePuffle}
        onAddFriend={addFriend}
        onAcceptFriend={acceptFriend}
        onDeclineFriend={declineFriend}
        onRemoveFriend={removeFriend}
        onSignOut={signOut}
      />
    )
  }, [
    broken,
    ready,
    userId,
    profile,
    inventory,
    friends,
    requests,
    adopt,
    reload,
    buyItem,
    equip,
    awardCoins,
    renamePuffle,
    addFriend,
    acceptFriend,
    declineFriend,
    removeFriend,
    signOut,
  ])

  return content
}

function Splash({ label }: { label: string }) {
  return (
    <div className="splash">
      <div className="splash-orb" />
      <p>{label}</p>
    </div>
  )
}
