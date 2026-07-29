# Snowfall Island

A small multiplayer snow world in the spirit of the old browser penguin games:
make an account, name your penguin, waddle around seven rooms, chat in speech
bubbles, throw snowballs, play three minigames for coins, and spend them on hats.

Built to run on Vercel's free tier with Supabase as the entire backend. All the
artwork is drawn procedurally on a canvas — there isn't a single image file in
the repo.

## Why there's no backend server

You mentioned a 500 MB memory budget, so the design goal was to need as close to
zero server RAM as possible:

| Piece | Where it runs | Memory |
| --- | --- | --- |
| React app | Static files on Vercel's CDN | **0 MB** — no server process |
| Auth, database | Supabase Postgres | Managed, free tier |
| Multiplayer (movement, chat, snowballs) | Supabase Realtime websockets | Managed, free tier |
| Game rules (coins, purchases) | Postgres functions | Managed, free tier |

Adding a Node/Python/Go service would have cost 60–200 MB to do work Supabase
already does. The one thing a backend is genuinely good for — stopping players
from inventing coins — is handled by `SECURITY DEFINER` Postgres functions plus
row level security, so the browser never gets to write its own balance.

The production bundle is ~125 KB gzipped.

## Setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor**, paste in all of [`supabase/schema.sql`](supabase/schema.sql), and run it.
   It creates the tables, the item catalogue, the RPCs and the RLS policies, and it's safe to re-run.
3. Go to **Authentication → Providers → Email** and turn **Confirm email** *off*.
   Otherwise your friend has to click a confirmation link before they can play.
4. Copy the **Project URL** and the **anon public** key from **Project Settings → API**.

### 2. Run it locally

```bash
npm install
cp .env.example .env.local   # then paste in your URL and anon key
npm run dev
```

### 3. Deploy to Vercel

```bash
npx vercel
```

Or push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new).
Vercel auto-detects Vite; the settings in `vercel.json` are already correct.

**Add both environment variables** in Vercel → Settings → Environment Variables:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

They're baked into the bundle at build time, so redeploy after adding them. The
anon key is meant to be public — row level security is what protects the data.

## What's in the world

**Rooms** — Town Centre (hub), Snowy Plaza, The Dock, Ski Hill, Gift Shop,
Coffee Shop and the Dance Club. Click a door or a signpost to travel.

**Playing with other people** — every room is a Realtime channel. Presence
tracks who's in the room, and movement, chat, emotes and snowballs go over
broadcast. Penguins interpolate toward their target, so other players glide
rather than teleport.

**Minigames** — all three pay coins, capped server-side:

| Game | Where | How it works |
| --- | --- | --- |
| Sled Rush | Ski Hill | Steer downhill, dodge trees, grab coins. Speeds up forever. |
| Ice Fishing | The Dock | 70 seconds to hook fish and avoid jellyfish. |
| Coffee Rush | Coffee Shop | Catch falling sacks in a cart. Drop three and you're out. |

**The Gift Shop** — colours, hats, shirts, neck items, hand-held props, shoes,
puffles, furniture and igloo styles: 60 things to buy. Every tile shows a live
preview of the actual item. Buying and wearing both go through the database, so
other players see your outfit immediately.

**Puffles** — adopt a pet from Snow Pets in the Plaza and it follows you from
room to room, hopping to keep up and bobbing while you stand still. Ten
colours, and you can give yours a name.

**Igloos** — everybody gets one. Press **Decorate** in your own igloo to place
furniture: click a piece from the tray, click the floor to put it down, drag to
move it, Delete to put it away. There are 16 pieces of furniture and three igloo
styles (Snow Igloo, Log Cabin, Ice Palace). Friends can walk into your igloo and
see exactly how you arranged it.

**Player cards** — click any penguin to see their card: what they're wearing,
their puffle, a button to add them as a friend and a button to visit their igloo.

**Friends** — send and accept requests, then see which of your friends are
online and which room they're in. "Join" walks you straight to them.

**The map** — press `M` for the island map, with a live count of how many
penguins are in each room, plus a shortcut home to your igloo.

## Controls

| Key | Action |
| --- | --- |
| Click | Walk there, or enter a door |
| `Enter` | Jump to the chat box |
| `W` | Wave |
| `D` | Dance |
| `S` | Sit |
| `T` | Snowball mode — then click to throw |
| `M` | Island map |
| `F` | Friends list |
| `Esc` | Cancel / close |

Click another penguin to open their player card.

## How cheating is prevented

- `coins` can't be written by the browser at all. A trigger silently reverts any
  client-side change to the column, so coins only move through `award_coins()`
  and `buy_item()`.
- `award_coins()` caps each game's payout and refuses to pay out more than once
  every 15 seconds.
- You can only wear items in your `inventory`, enforced by a trigger rather than
  by the UI. The same trigger guards igloos: you cannot place furniture or pick
  an igloo style you haven't bought.
- The `inventory` table has no insert policy, so rows appear only via
  `buy_item()`.
- Friendships have no write policies either — they move only through
  `send_friend_request()`, `accept_friend_request()` and `remove_friend()`, so
  nobody can add themselves to your friends list.

A determined player could still inflate a game score up to the per-game cap —
stopping that properly means simulating the game on a server, which is exactly
the memory cost we were avoiding.

## Project layout

```
src/
  game/
    items.ts      Item catalogue + the drawing code for every hat, shirt, etc.
    furniture.ts  Igloo furniture and the three igloo styles
    puffles.ts    Puffle drawing and colours
    palette.ts    Colour helpers, penguin body colours, light falloff
    render.ts     Penguin drawing, speech bubbles, snowballs
    rooms.ts      The seven rooms plus the igloo builder
    scenery.ts    Reusable scenery: mountains, buildings, water, snowfall…
    useRoom.ts    Realtime presence + broadcast for one room
    useIsland.ts  Island-wide presence: who's online and where
  components/
    Auth.tsx      Login / signup over an animated title scene
    CreatePenguin.tsx
    World.tsx     The main view: canvas loop, chat, HUD, igloo editing
    Shop.tsx      Wardrobe and shop
    PlayerCard.tsx / FriendsPanel.tsx / MapPanel.tsx / IglooEditor.tsx
    games/        The three minigames
supabase/
  schema.sql      Tables, item catalogue, RPCs, triggers, RLS — run this first
```

Note that `furniture.ts` deliberately imports only from `palette.ts`. Reaching
for `scenery.ts` there creates an import cycle
(`furniture → scenery → render → items → furniture`) that leaves `FURNITURE`
uninitialised at module load.

## Notes

The name, artwork, rooms, items and games here are all original — the drawing
code produces its own vector penguins rather than using anyone else's assets.
It's a tribute to the genre, not a copy of a specific game's files.
