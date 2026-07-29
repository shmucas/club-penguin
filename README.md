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

**The Gift Shop** — 31 items across colours, hats, shirts, neck items, hand-held
props and shoes. Every tile shows a live penguin actually wearing the item.
Buying and wearing both go through the database, so other players see your
outfit immediately.

## Controls

| Key | Action |
| --- | --- |
| Click | Walk there, or enter a door |
| `Enter` | Jump to the chat box |
| `W` | Wave |
| `D` | Dance |
| `S` | Sit |
| `T` | Snowball mode — then click to throw |
| `Esc` | Cancel / close |

## How cheating is prevented

- `coins` can't be written by the browser at all. A trigger silently reverts any
  client-side change to the column, so coins only move through `award_coins()`
  and `buy_item()`.
- `award_coins()` caps each game's payout and refuses to pay out more than once
  every 15 seconds.
- You can only wear items in your `inventory`, enforced by a trigger rather than
  by the UI.
- The `inventory` table has no insert policy, so rows appear only via
  `buy_item()`.

A determined player could still inflate a game score up to the per-game cap —
stopping that properly means simulating the game on a server, which is exactly
the memory cost we were avoiding.

## Project layout

```
src/
  game/
    items.ts      Item catalogue + the drawing code for every hat, shirt, etc.
    palette.ts    Colour helpers and penguin body colours
    render.ts     Penguin drawing, speech bubbles, snowballs
    rooms.ts      The seven rooms: art, walkable area, clickable hotspots
    scenery.ts    Reusable scenery: mountains, buildings, water, snowfall…
    useRoom.ts    Realtime presence + broadcast for one room
  components/
    Auth.tsx      Login / signup over an animated title scene
    CreatePenguin.tsx
    World.tsx     The main view: canvas loop, chat, HUD
    Shop.tsx      Wardrobe and shop
    games/        The three minigames
supabase/
  schema.sql      Tables, item catalogue, RPCs, triggers, RLS — run this first
```

## Notes

The name, artwork, rooms, items and games here are all original — the drawing
code produces its own vector penguins rather than using anyone else's assets.
It's a tribute to the genre, not a copy of a specific game's files.
