# Snowfall Island

A small multiplayer snow world in the spirit of the old browser penguin games:
make an account, name your penguin, waddle around seven rooms, chat in speech
bubbles, throw snowballs, play three minigames for coins, and spend them on hats.

Built to run on Vercel's free tier with Neon Postgres as the whole database and
a handful of Vercel Functions as the API. All the artwork is drawn procedurally
on a canvas: there isn't a single image file in the repo.

## How it's put together

| Piece | Where it runs |
| --- | --- |
| React app | Static files on Vercel's CDN, no server process |
| API (`/api/*`) | Vercel Functions, one HTTP query per request |
| Auth, database, game rules | Neon Postgres |
| Multiplayer (movement, chat, snowballs) | `POST /api/room`, polled twice a second |

There is no long-running server. The functions talk to Neon over its HTTP driver
rather than holding a TCP connection open, so a room full of players cannot
exhaust the database's connection limit. Everything that has to be atomic
(spending coins, accepting a friend request, a room poll) is a single Postgres
function call.

The production bundle is ~78 KB gzipped.

## Setup

### 1. Neon

1. Create a free project at [neon.com](https://neon.com) and copy its connection string.
2. Put it in `.env.local` as `DATABASE_URL`, then run the schema:

   ```bash
   npm install
   cp .env.example .env.local   # paste in your connection string
   npm run db:push              # applies db/schema.sql, safe to re-run
   ```

3. Generate a session secret and add it to `.env.local` as `SESSION_SECRET`:

   ```bash
   openssl rand -hex 32
   ```

### 2. Run it locally

```bash
npm run dev
```

That is `vercel dev`, which serves the app and the `/api` functions together.
`npm run dev:web` runs plain Vite, which gives you the UI but no API.

### 3. Deploy to Vercel

```bash
npx vercel
```

Or push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new).
Vercel auto-detects Vite; the settings in `vercel.json` are already correct.

**Add both environment variables** in Vercel → Settings → Environment Variables,
for Production, Preview and Development:

```
DATABASE_URL      (the Neon integration adds this for you)
SESSION_SECRET
```

Both are read on the server only, never shipped to the browser. `GET /api/health`
tells you whether a deployment can reach the database.

## What's in the world

**Rooms** — Town Centre (hub), Snowy Plaza, The Dock, Ski Hill, Gift Shop,
Coffee Shop and the Dance Club. Click a door or a signpost to travel.

**Playing with other people** — your client posts to `/api/room` about twice a
second. That one request publishes where you are and returns both the room's
roster and everything said since your last poll, so movement, chat, emotes and
snowballs all arrive together. Penguins interpolate toward their target rather
than jumping to it, so a click-to-walk still looks smooth between polls.

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

The browser never talks to the database. It talks to `/api`, and every route
takes the acting player from a signed HttpOnly session cookie, never from the
request body: you cannot act as someone else by editing a payload.

- `coins` are not writable through any route. They move only through
  `buy_item()` and `award_coins()`, and `PATCH /api/penguin` accepts nothing but
  `color`, `equipped` and `puffleNames`.
- `award_coins()` caps each game's payout and refuses to pay out more than once
  every 15 seconds.
- You can only wear items in your `inventory`, enforced by a database trigger
  rather than by the UI. The same trigger guards igloos: you cannot place
  furniture or pick an igloo style you haven't bought.
- `POST /api/igloo` always saves the *session's* igloo, so there is no owner
  field to tamper with.
- Friend requests and friendships move only through the Postgres functions, so
  nobody can add themselves to your friends list.

A determined player could still inflate a game score up to the per-game cap.
Stopping that properly means simulating the game on the server, which is more
machinery than this deserves.

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
    useRoom.ts    The room sync loop: roster, movement, chat, snowballs
    useIsland.ts  Island-wide presence: who's online and where
  lib/
    api.ts        Every call to /api, typed
  components/
    Auth.tsx      Login / signup over an animated title scene
    CreatePenguin.tsx
    World.tsx     The main view: canvas loop, chat, HUD, igloo editing
    Shop.tsx      Wardrobe and shop
    PlayerCard.tsx / FriendsPanel.tsx / MapPanel.tsx / IglooEditor.tsx
    games/        The three minigames
api/
  _lib/db.ts      Neon HTTP client + Postgres error mapping
  _lib/session.ts Password hashing and the signed session cookie
  auth.ts         Session, signup, login, logout
  penguin.ts      Create the penguin; change colour, outfit, puffle names
  coins.ts        Buy an item, or claim a minigame payout
  friends.ts      List, request, accept, decline, remove
  igloo.ts        Read anyone's igloo, save your own
  room.ts         Island presence (GET) and the room sync (POST)
  health.ts       Is the database reachable?
db/
  schema.sql      Tables, item catalogue, functions, triggers — run this first
```

Note that `furniture.ts` deliberately imports only from `palette.ts`. Reaching
for `scenery.ts` there creates an import cycle
(`furniture → scenery → render → items → furniture`) that leaves `FURNITURE`
uninitialised at module load.

## Notes

The name, artwork, rooms, items and games here are all original — the drawing
code produces its own vector penguins rather than using anyone else's assets.
It's a tribute to the genre, not a copy of a specific game's files.
