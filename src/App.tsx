import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isConfigured, supabase } from './lib/supabase'
import type { Equipped, FriendSummary, GameId, Profile, Slot } from './lib/types'
import { Auth } from './components/Auth'
import { CreatePenguin } from './components/CreatePenguin'
import { World } from './components/World'
import { Setup } from './components/Setup'

export function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [inventory, setInventory] = useState<Set<string>>(new Set())
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [friends, setFriends] = useState<FriendSummary[]>([])
  const [requests, setRequests] = useState<FriendSummary[]>([])

  useEffect(() => {
    if (!isConfigured) {
      setReady(true)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (!next) {
        setProfile(null)
        setInventory(new Set())
        setFriends([])
        setRequests([])
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const refreshFriends = useCallback(async () => {
    const [{ data: mine }, { data: pending }] = await Promise.all([
      supabase.rpc('my_friends'),
      supabase.rpc('my_friend_requests'),
    ])
    const shape = (rows: unknown): FriendSummary[] =>
      ((rows ?? []) as FriendSummary[]).map((r) => ({ ...r, equipped: (r.equipped ?? {}) as Equipped }))
    setFriends(shape(mine))
    setRequests(shape(pending))
  }, [])

  const loadProfile = useCallback(
    async (userId: string) => {
      setLoadingProfile(true)
      const [{ data: prof }, { data: inv }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, color, coins, equipped, puffle_names')
          .eq('id', userId)
          .maybeSingle(),
        supabase.from('inventory').select('item_id').eq('profile_id', userId),
      ])
      setProfile(
        prof
          ? ({
              id: prof.id,
              username: prof.username,
              color: prof.color,
              coins: prof.coins,
              equipped: (prof.equipped ?? {}) as Equipped,
              puffleNames: (prof.puffle_names ?? {}) as Record<string, string>,
            } satisfies Profile)
          : null,
      )
      setInventory(new Set((inv ?? []).map((r) => r.item_id as string)))
      setLoadingProfile(false)
      if (prof) void refreshFriends()
    },
    [refreshFriends],
  )

  useEffect(() => {
    if (session?.user.id) void loadProfile(session.user.id)
  }, [session?.user.id, loadProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  /** Buy an item through the RPC, then reflect the new balance locally. */
  const buyItem = useCallback(async (itemId: string) => {
    const { data, error } = await supabase.rpc('buy_item', { p_item: itemId })
    if (error) throw new Error(error.message)
    setProfile((p) => (p ? { ...p, coins: data as number } : p))
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
    const { error } = await supabase
      .from('profiles')
      .update({ color: target.color, equipped: target.equipped })
      .eq('id', target.id)
    if (error) throw new Error(error.message)
  }, [])

  /** Give a puffle a nickname. Stored on the profile as a plain JSON map. */
  const renamePuffle = useCallback(async (puffleId: string, name: string) => {
    let next: Record<string, string> = {}
    setProfile((p) => {
      if (!p) return p
      next = { ...p.puffleNames, [puffleId]: name.trim().slice(0, 16) }
      return { ...p, puffleNames: next }
    })
    const { error } = await supabase.auth.getUser().then(({ data }) =>
      supabase.from('profiles').update({ puffle_names: next }).eq('id', data.user?.id ?? ''),
    )
    if (error) throw new Error(error.message)
  }, [])

  const addFriend = useCallback(
    async (id: string) => {
      const { error } = await supabase.rpc('send_friend_request', { p_to: id })
      if (error) throw new Error(error.message)
      await refreshFriends()
    },
    [refreshFriends],
  )

  const acceptFriend = useCallback(
    async (id: string) => {
      const { error } = await supabase.rpc('accept_friend_request', { p_from: id })
      if (error) throw new Error(error.message)
      await refreshFriends()
    },
    [refreshFriends],
  )

  const declineFriend = useCallback(
    async (id: string) => {
      const { error } = await supabase.rpc('decline_friend_request', { p_from: id })
      if (error) throw new Error(error.message)
      await refreshFriends()
    },
    [refreshFriends],
  )

  const removeFriend = useCallback(
    async (id: string) => {
      const { error } = await supabase.rpc('remove_friend', { p_other: id })
      if (error) throw new Error(error.message)
      await refreshFriends()
    },
    [refreshFriends],
  )

  const awardCoins = useCallback(async (game: GameId, score: number) => {
    const { data, error } = await supabase.rpc('award_coins', { p_game: game, p_score: score })
    if (error) throw new Error(error.message)
    const coins = data as number
    setProfile((p) => (p ? { ...p, coins } : p))
    return coins
  }, [])

  const content = useMemo(() => {
    if (!isConfigured) return <Setup />
    if (!ready) return <Splash label="Warming up the island…" />
    if (!session) return <Auth />
    if (loadingProfile) return <Splash label="Finding your penguin…" />
    if (!profile) {
      return (
        <CreatePenguin
          userId={session.user.id}
          onCreated={() => loadProfile(session.user.id)}
          onSignOut={signOut}
        />
      )
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
    ready,
    session,
    loadingProfile,
    profile,
    inventory,
    friends,
    requests,
    buyItem,
    equip,
    awardCoins,
    renamePuffle,
    addFriend,
    acceptFriend,
    declineFriend,
    removeFriend,
    signOut,
    loadProfile,
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
