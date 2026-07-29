-- Snowfall Island - full database schema for Neon Postgres.
-- Run once: npm run db:push (or paste into the Neon SQL Editor).
-- It is idempotent: re-running it is safe.
--
-- There is no row level security here. Nothing connects to this database except
-- the API routes in /api, which run as the owner. Every rule that used to be a
-- policy is now either an explicit filter in the route or a check in one of the
-- functions below. The functions take the acting player as `p_actor`, which the
-- routes read from the signed session cookie and never from the request body.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------

create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

create unique index if not exists users_email_lower_idx on public.users (lower(email));

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id           uuid primary key references public.users on delete cascade,
  username     text not null check (char_length(username) between 3 and 16),
  color        text not null default 'color_blue',
  coins        integer not null default 500 check (coins >= 0),
  equipped     jsonb not null default '{}'::jsonb,
  puffle_names jsonb not null default '{}'::jsonb,
  last_award   timestamptz not null default (now() - interval '1 hour'),
  created_at   timestamptz not null default now()
);

-- Case-insensitive unique penguin names.
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

create table if not exists public.items (
  id    text primary key,
  name  text not null,
  slot  text not null,
  cost  integer not null check (cost >= 0)
);

-- Puffles, furniture and igloo styles are items too, so one inventory and one
-- buy_item() covers everything the player can own.
alter table public.items drop constraint if exists items_slot_check;
alter table public.items add constraint items_slot_check check (
  slot in ('color', 'hat', 'shirt', 'neck', 'hand', 'feet', 'puffle', 'furniture', 'igloo')
);

create table if not exists public.inventory (
  profile_id  uuid not null references public.profiles on delete cascade,
  item_id     text not null references public.items on delete cascade,
  acquired_at timestamptz not null default now(),
  primary key (profile_id, item_id)
);

-- Every penguin gets an igloo: a private room they decorate and friends visit.
create table if not exists public.igloos (
  owner      uuid primary key references public.profiles on delete cascade,
  style      text not null default 'igloo_classic',
  items      jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.friend_requests (
  from_id    uuid not null references public.profiles on delete cascade,
  to_id      uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id),
  check (from_id <> to_id)
);

-- One row per friendship, with the ids stored in a canonical order.
create table if not exists public.friendships (
  a          uuid not null references public.profiles on delete cascade,
  b          uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);

create index if not exists friendships_b_idx on public.friendships (b);
create index if not exists friend_requests_to_idx on public.friend_requests (to_id);

-- ---------------------------------------------------------------------------
-- Multiplayer: presence and a short-lived event log, polled by the client
-- ---------------------------------------------------------------------------

-- Where each penguin is right now. One row per player, overwritten on poll.
create table if not exists public.presence (
  profile_id uuid primary key references public.profiles on delete cascade,
  room_id    text not null,
  room_name  text not null,
  x          integer not null,
  y          integer not null,
  tx         integer not null,
  ty         integer not null,
  dir        smallint not null default 1,
  updated_at timestamptz not null default now()
);

create index if not exists presence_room_idx on public.presence (room_id, updated_at);

-- Movement, chat, emotes and snowballs. Rows live for seconds: clients read
-- everything newer than the last id they saw, then the log is trimmed.
create table if not exists public.room_events (
  id         bigserial primary key,
  room_id    text not null,
  from_id    uuid not null references public.profiles on delete cascade,
  kind       text not null check (kind in ('move', 'chat', 'emote', 'snowball')),
  payload    jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists room_events_room_idx on public.room_events (room_id, id);

-- ---------------------------------------------------------------------------
-- Item catalogue (must stay in sync with src/game/items.ts)
-- ---------------------------------------------------------------------------

insert into public.items (id, name, slot, cost) values
  ('color_blue',       'Blue',            'color', 0),
  ('color_red',        'Red',             'color', 120),
  ('color_green',      'Green',           'color', 120),
  ('color_pink',       'Pink',            'color', 120),
  ('color_purple',     'Purple',          'color', 160),
  ('color_orange',     'Orange',          'color', 160),
  ('color_aqua',       'Aqua',            'color', 160),
  ('color_yellow',     'Yellow',          'color', 200),
  ('color_black',      'Black',           'color', 400),
  ('color_mint',       'Mint',            'color', 400),
  ('hat_beanie',       'Bobble Beanie',   'hat',   80),
  ('hat_cap',          'Backwards Cap',   'hat',   90),
  ('hat_viking',       'Viking Helmet',   'hat',   350),
  ('hat_top',          'Top Hat',         'hat',   300),
  ('hat_crown',        'Gold Crown',      'hat',   800),
  ('hat_propeller',    'Propeller Cap',   'hat',   250),
  ('hat_earmuffs',     'Earmuffs',        'hat',   120),
  ('shirt_stripes',    'Striped Sweater', 'shirt', 150),
  ('shirt_hoodie',     'Cosy Hoodie',     'shirt', 200),
  ('shirt_tux',        'Tuxedo',          'shirt', 450),
  ('shirt_lifejacket', 'Life Jacket',     'shirt', 180),
  ('shirt_hawaii',     'Island Shirt',    'shirt', 220),
  ('neck_scarf',       'Wool Scarf',      'neck',  100),
  ('neck_bowtie',      'Bow Tie',         'neck',  110),
  ('neck_cape',        'Hero Cape',       'neck',  500),
  ('hand_flag',        'Island Flag',     'hand',  140),
  ('hand_lantern',     'Snow Lantern',    'hand',  190),
  ('hand_rod',         'Fishing Rod',     'hand',  240),
  ('hand_balloon',     'Red Balloon',     'hand',  160),
  ('feet_boots',       'Snow Boots',      'feet',  130),
  ('feet_skis',        'Tiny Skis',       'feet',  280),

  ('puffle_blue',      'Blue Puffle',     'puffle', 200),
  ('puffle_pink',      'Pink Puffle',     'puffle', 200),
  ('puffle_green',     'Green Puffle',    'puffle', 250),
  ('puffle_purple',    'Purple Puffle',   'puffle', 300),
  ('puffle_red',       'Red Puffle',      'puffle', 350),
  ('puffle_yellow',    'Yellow Puffle',   'puffle', 400),
  ('puffle_orange',    'Orange Puffle',   'puffle', 450),
  ('puffle_white',     'White Puffle',    'puffle', 600),
  ('puffle_black',     'Black Puffle',    'puffle', 750),
  ('puffle_rainbow',   'Rainbow Puffle',  'puffle', 1200),

  ('furn_sofa',        'Comfy Sofa',      'furniture', 220),
  ('furn_armchair',    'Armchair',        'furniture', 160),
  ('furn_table',       'Round Table',     'furniture', 140),
  ('furn_lamp',        'Floor Lamp',      'furniture', 120),
  ('furn_plant',       'Potted Plant',    'furniture', 100),
  ('furn_tv',          'Television',      'furniture', 380),
  ('furn_shelf',       'Bookshelf',       'furniture', 260),
  ('furn_fishtank',    'Fish Tank',       'furniture', 420),
  ('furn_rug',         'Round Rug',       'furniture', 130),
  ('furn_fire',        'Fireplace',       'furniture', 480),
  ('furn_snowman',     'Indoor Snowman',  'furniture', 190),
  ('furn_speaker',     'Big Speaker',     'furniture', 340),
  ('furn_throne',      'Golden Throne',   'furniture', 900),
  ('furn_bed',         'Cosy Bed',        'furniture', 300),
  ('furn_piano',       'Piano',           'furniture', 700),
  ('furn_tree',        'Little Pine',     'furniture', 150),

  ('igloo_classic',    'Snow Igloo',      'igloo', 0),
  ('igloo_cabin',      'Log Cabin',       'igloo', 900),
  ('igloo_deluxe',     'Ice Palace',      'igloo', 1600)
on conflict (id) do update
  set name = excluded.name, slot = excluded.slot, cost = excluded.cost;

-- ---------------------------------------------------------------------------
-- Guards: you may only wear or place what you own
-- ---------------------------------------------------------------------------

create or replace function public.guard_profile_update()
returns trigger
language plpgsql
as $$
declare
  v_item text;
begin
  if new.color is distinct from old.color then
    if not exists (select 1 from public.inventory
                   where profile_id = new.id and item_id = new.color) then
      raise exception 'You do not own the colour %', new.color using errcode = '42501';
    end if;
  end if;

  if new.equipped is distinct from old.equipped then
    if jsonb_typeof(new.equipped) is distinct from 'object' then
      raise exception 'equipped must be a JSON object' using errcode = '22023';
    end if;
    for v_item in select value #>> '{}' from jsonb_each(new.equipped) loop
      if v_item is not null and v_item <> '' and not exists (
        select 1 from public.inventory
        where profile_id = new.id and item_id = v_item
      ) then
        raise exception 'You do not own the item %', v_item using errcode = '42501';
      end if;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_update on public.profiles;
create trigger guard_profile_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- New penguins start owning the free items, and get an empty igloo.
create or replace function public.grant_starter_items()
returns trigger
language plpgsql
as $$
begin
  insert into public.inventory (profile_id, item_id)
  select new.id, id from public.items where cost = 0
  on conflict do nothing;

  insert into public.igloos (owner) values (new.id)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists grant_starter_items on public.profiles;
create trigger grant_starter_items
  after insert on public.profiles
  for each row execute function public.grant_starter_items();

-- An igloo may only contain furniture its owner actually bought.
create or replace function public.guard_igloo()
returns trigger
language plpgsql
as $$
declare
  v_item text;
begin
  if jsonb_typeof(new.items) is distinct from 'array' then
    raise exception 'Igloo contents must be a JSON array' using errcode = '22023';
  end if;

  if jsonb_array_length(new.items) > 60 then
    raise exception 'That is a lot of furniture - 60 pieces maximum' using errcode = '22023';
  end if;

  for v_item in select value ->> 'item' from jsonb_array_elements(new.items) loop
    if not exists (select 1 from public.inventory
                   where profile_id = new.owner and item_id = v_item) then
      raise exception 'You do not own the furniture %', v_item using errcode = '42501';
    end if;
  end loop;

  if new.style is distinct from old.style then
    if not exists (select 1 from public.inventory
                   where profile_id = new.owner and item_id = new.style) then
      raise exception 'You do not own the igloo style %', new.style using errcode = '42501';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists guard_igloo on public.igloos;
create trigger guard_igloo
  before update on public.igloos
  for each row execute function public.guard_igloo();

-- ---------------------------------------------------------------------------
-- Coins - the only way they are created or spent
-- ---------------------------------------------------------------------------

create or replace function public.award_coins(p_actor uuid, p_game text, p_score integer)
returns integer
language plpgsql
as $$
declare
  v_cap   integer;
  v_award integer;
  v_coins integer;
  v_last  timestamptz;
begin
  -- Per-game ceiling: a perfect run is worth a few hundred coins, no more.
  v_cap := case p_game
             when 'sled'    then 350
             when 'fishing' then 350
             when 'coffee'  then 350
             else 0
           end;
  if v_cap = 0 then
    raise exception 'Unknown game %', p_game using errcode = '22023';
  end if;

  v_award := least(greatest(coalesce(p_score, 0), 0), v_cap);

  select last_award into v_last from public.profiles where id = p_actor for update;
  if v_last is null then
    raise exception 'No penguin yet' using errcode = '42501';
  end if;
  -- A game round can't physically finish faster than this; blocks payout spam.
  if now() - v_last < interval '15 seconds' then
    raise exception 'Slow down!' using errcode = '53400';
  end if;

  update public.profiles
     set coins = coins + v_award,
         last_award = now()
   where id = p_actor
  returning coins into v_coins;

  return v_coins;
end;
$$;

create or replace function public.buy_item(p_actor uuid, p_item text)
returns integer
language plpgsql
as $$
declare
  v_cost  integer;
  v_coins integer;
begin
  select cost into v_cost from public.items where id = p_item;
  if v_cost is null then
    raise exception 'No such item' using errcode = '22023';
  end if;

  if exists (select 1 from public.inventory
             where profile_id = p_actor and item_id = p_item) then
    raise exception 'You already own that' using errcode = '23505';
  end if;

  update public.profiles
     set coins = coins - v_cost
   where id = p_actor and coins >= v_cost
  returning coins into v_coins;

  if v_coins is null then
    raise exception 'Not enough coins' using errcode = '53400';
  end if;

  insert into public.inventory (profile_id, item_id) values (p_actor, p_item);
  return v_coins;
end;
$$;

-- Creates the penguin and grants whichever starter colour was picked.
create or replace function public.create_penguin(p_actor uuid, p_username text, p_color text)
returns void
language plpgsql
as $$
begin
  if p_username !~ '^[A-Za-z0-9 _-]{3,16}$' then
    raise exception 'Names are 3-16 letters, numbers, spaces, - or _' using errcode = '22023';
  end if;

  if not exists (select 1 from public.items where id = p_color and slot = 'color') then
    raise exception 'Unknown colour' using errcode = '22023';
  end if;

  insert into public.profiles (id, username, color) values (p_actor, trim(p_username), p_color);
  insert into public.inventory (profile_id, item_id) values (p_actor, p_color)
    on conflict do nothing;
exception
  when unique_violation then
    raise exception 'That name is taken' using errcode = '23505';
end;
$$;

-- ---------------------------------------------------------------------------
-- Friends
-- ---------------------------------------------------------------------------

-- Sending a request back to someone who already asked you accepts it instead.
create or replace function public.send_friend_request(p_actor uuid, p_to uuid)
returns text
language plpgsql
as $$
declare
  v_a uuid;
  v_b uuid;
begin
  if p_to = p_actor then
    raise exception 'You cannot befriend yourself' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = p_to) then
    raise exception 'No such penguin' using errcode = '22023';
  end if;

  v_a := least(p_actor, p_to);
  v_b := greatest(p_actor, p_to);

  if exists (select 1 from public.friendships where a = v_a and b = v_b) then
    return 'already';
  end if;

  if exists (select 1 from public.friend_requests
             where from_id = p_to and to_id = p_actor) then
    delete from public.friend_requests
     where (from_id = p_to and to_id = p_actor)
        or (from_id = p_actor and to_id = p_to);
    insert into public.friendships (a, b) values (v_a, v_b) on conflict do nothing;
    return 'accepted';
  end if;

  insert into public.friend_requests (from_id, to_id)
  values (p_actor, p_to)
  on conflict do nothing;
  return 'sent';
end;
$$;

create or replace function public.accept_friend_request(p_actor uuid, p_from uuid)
returns void
language plpgsql
as $$
declare
  v_a uuid;
  v_b uuid;
begin
  if not exists (select 1 from public.friend_requests
                 where from_id = p_from and to_id = p_actor) then
    raise exception 'No such request' using errcode = '22023';
  end if;
  v_a := least(p_actor, p_from);
  v_b := greatest(p_actor, p_from);
  delete from public.friend_requests
   where (from_id = p_from and to_id = p_actor)
      or (from_id = p_actor and to_id = p_from);
  insert into public.friendships (a, b) values (v_a, v_b) on conflict do nothing;
end;
$$;

create or replace function public.decline_friend_request(p_actor uuid, p_from uuid)
returns void
language sql
as $$
  delete from public.friend_requests where from_id = p_from and to_id = p_actor;
$$;

create or replace function public.remove_friend(p_actor uuid, p_other uuid)
returns void
language sql
as $$
  delete from public.friendships
   where a = least(p_actor, p_other) and b = greatest(p_actor, p_other);
$$;

create or replace function public.my_friends(p_actor uuid)
returns table (id uuid, username text, color text, equipped jsonb)
language sql
stable
as $$
  select p.id, p.username, p.color, p.equipped
    from public.friendships f
    join public.profiles p
      on p.id = case when f.a = p_actor then f.b else f.a end
   where f.a = p_actor or f.b = p_actor
   order by p.username;
$$;

create or replace function public.my_friend_requests(p_actor uuid)
returns table (id uuid, username text, color text, equipped jsonb)
language sql
stable
as $$
  select p.id, p.username, p.color, p.equipped
    from public.friend_requests r
    join public.profiles p on p.id = r.from_id
   where r.to_id = p_actor
   order by r.created_at;
$$;

create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
as $$
  select not exists (
    select 1 from public.profiles where lower(username) = lower(p_username)
  );
$$;

-- ---------------------------------------------------------------------------
-- room_sync - one round trip per poll: publish me, collect everyone else
-- ---------------------------------------------------------------------------

-- p_events is a JSON array of {kind, payload} the client wants to send.
-- Returns {players, events, lastId}: who is in the room, and everything that
-- happened after p_since.
create or replace function public.room_sync(
  p_actor  uuid,
  p_room   text,
  p_name   text,
  p_x      integer,
  p_y      integer,
  p_tx     integer,
  p_ty     integer,
  p_dir    integer,
  p_since  bigint,
  p_events jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_players jsonb;
  v_events  jsonb;
  v_last    bigint;
begin
  -- A negative cursor means "I just joined": skip whatever was said before.
  if p_since < 0 then
    select coalesce(max(id), 0) into p_since from public.room_events;
  end if;

  insert into public.presence (profile_id, room_id, room_name, x, y, tx, ty, dir, updated_at)
  values (p_actor, p_room, coalesce(p_name, p_room), p_x, p_y, p_tx, p_ty,
          case when p_dir < 0 then -1 else 1 end, now())
  on conflict (profile_id) do update
    set room_id = excluded.room_id,
        room_name = excluded.room_name,
        x = excluded.x, y = excluded.y,
        tx = excluded.tx, ty = excluded.ty,
        dir = excluded.dir,
        updated_at = now();

  if p_events is not null and jsonb_typeof(p_events) = 'array' then
    insert into public.room_events (room_id, from_id, kind, payload)
    select p_room, p_actor, e ->> 'kind', coalesce(e -> 'payload', '{}'::jsonb)
      from jsonb_array_elements(p_events) e
     where e ->> 'kind' in ('move', 'chat', 'emote', 'snowball')
     limit 20;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', pr.profile_id, 'username', p.username, 'color', p.color,
           'equipped', p.equipped, 'x', pr.x, 'y', pr.y,
           'tx', pr.tx, 'ty', pr.ty, 'dir', pr.dir
         )), '[]'::jsonb)
    into v_players
    from public.presence pr
    join public.profiles p on p.id = pr.profile_id
   where pr.room_id = p_room
     and pr.updated_at > now() - interval '15 seconds';

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', e.id, 'from', e.from_id, 'kind', e.kind, 'payload', e.payload
           || jsonb_build_object('id', e.from_id, 'name', p.username)
         ) order by e.id), '[]'::jsonb),
         coalesce(max(e.id), p_since)
    into v_events, v_last
    from public.room_events e
    join public.profiles p on p.id = e.from_id
   where e.room_id = p_room
     and e.id > p_since
     and e.from_id <> p_actor
     and e.created_at > now() - interval '15 seconds';

  -- Trim the log now and then rather than on every single poll.
  if random() < 0.02 then
    delete from public.room_events where created_at < now() - interval '1 minute';
    delete from public.presence where updated_at < now() - interval '5 minutes';
  end if;

  return jsonb_build_object(
    'players', v_players,
    'events', v_events,
    'lastId', coalesce(v_last, p_since)
  );
end;
$$;

-- Who is on the island and which room they are in. Powers the map counts and
-- the online dots in the friends list.
create or replace function public.island_online()
returns jsonb
language sql
stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', pr.profile_id, 'username', p.username, 'color', p.color,
           'equipped', p.equipped, 'room', pr.room_id, 'roomName', pr.room_name
         )), '[]'::jsonb)
    from public.presence pr
    join public.profiles p on p.id = pr.profile_id
   where pr.updated_at > now() - interval '20 seconds';
$$;
