-- Snowfall Island — full database schema.
-- Paste this whole file into the Supabase SQL Editor and run it once.
-- It is idempotent: re-running it is safe.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  username     text not null check (char_length(username) between 3 and 16),
  color        text not null default 'color_blue',
  coins        integer not null default 500 check (coins >= 0),
  equipped     jsonb not null default '{}'::jsonb,
  last_award   timestamptz not null default (now() - interval '1 hour'),
  created_at   timestamptz not null default now()
);

-- Nicknames the player gave their puffles: {"puffle_pink": "Biscuit"}.
alter table public.profiles
  add column if not exists puffle_names jsonb not null default '{}'::jsonb;

-- Case-insensitive unique penguin names.
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

create table if not exists public.items (
  id    text primary key,
  name  text not null,
  slot  text not null check (slot in ('color', 'hat', 'shirt', 'neck', 'hand', 'feet')),
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
-- Guards: the client owns its profile row, but not its wallet or wardrobe
-- ---------------------------------------------------------------------------

-- Clients connect as the `authenticated` role. SECURITY DEFINER functions below
-- run as the table owner, so they bypass these checks legitimately.
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item text;
begin
  if current_user = 'authenticated' then
    -- Coins may only move through award_coins() / buy_item().
    new.coins := old.coins;
    new.last_award := old.last_award;
  end if;

  -- You may only wear what you own, whoever is asking.
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
security definer
set search_path = public
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

-- An igloo may only contain furniture its owner actually bought.
create or replace function public.guard_igloo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item text;
begin
  if jsonb_typeof(new.items) is distinct from 'array' then
    raise exception 'Igloo contents must be a JSON array' using errcode = '22023';
  end if;

  if jsonb_array_length(new.items) > 60 then
    raise exception 'That is a lot of furniture — 60 pieces maximum' using errcode = '22023';
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

drop trigger if exists grant_starter_items on public.profiles;
create trigger grant_starter_items
  after insert on public.profiles
  for each row execute function public.grant_starter_items();

-- ---------------------------------------------------------------------------
-- RPCs — the only way coins are created or spent
-- ---------------------------------------------------------------------------

create or replace function public.award_coins(p_game text, p_score integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cap     integer;
  v_award   integer;
  v_coins   integer;
  v_last    timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

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

  select last_award into v_last from public.profiles where id = auth.uid() for update;
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
   where id = auth.uid()
  returning coins into v_coins;

  return v_coins;
end;
$$;

create or replace function public.buy_item(p_item text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cost  integer;
  v_coins integer;
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  select cost into v_cost from public.items where id = p_item;
  if v_cost is null then
    raise exception 'No such item' using errcode = '22023';
  end if;

  if exists (select 1 from public.inventory
             where profile_id = auth.uid() and item_id = p_item) then
    raise exception 'You already own that' using errcode = '23505';
  end if;

  update public.profiles
     set coins = coins - v_cost
   where id = auth.uid() and coins >= v_cost
  returning coins into v_coins;

  if v_coins is null then
    raise exception 'Not enough coins' using errcode = '53400';
  end if;

  insert into public.inventory (profile_id, item_id) values (auth.uid(), p_item);
  return v_coins;
end;
$$;

-- Creates the penguin and grants whichever starter colour was picked.
create or replace function public.create_penguin(p_username text, p_color text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  if p_username !~ '^[A-Za-z0-9 _-]{3,16}$' then
    raise exception 'Names are 3-16 letters, numbers, spaces, - or _' using errcode = '22023';
  end if;

  if not exists (select 1 from public.items where id = p_color and slot = 'color') then
    raise exception 'Unknown colour' using errcode = '22023';
  end if;

  insert into public.profiles (id, username, color) values (auth.uid(), trim(p_username), p_color);
  insert into public.inventory (profile_id, item_id) values (auth.uid(), p_color)
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
create or replace function public.send_friend_request(p_to uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a uuid;
  v_b uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if p_to = auth.uid() then
    raise exception 'You cannot befriend yourself' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = p_to) then
    raise exception 'No such penguin' using errcode = '22023';
  end if;

  v_a := least(auth.uid(), p_to);
  v_b := greatest(auth.uid(), p_to);

  if exists (select 1 from public.friendships where a = v_a and b = v_b) then
    return 'already';
  end if;

  if exists (select 1 from public.friend_requests
             where from_id = p_to and to_id = auth.uid()) then
    delete from public.friend_requests
     where (from_id = p_to and to_id = auth.uid())
        or (from_id = auth.uid() and to_id = p_to);
    insert into public.friendships (a, b) values (v_a, v_b) on conflict do nothing;
    return 'accepted';
  end if;

  insert into public.friend_requests (from_id, to_id)
  values (auth.uid(), p_to)
  on conflict do nothing;
  return 'sent';
end;
$$;

create or replace function public.accept_friend_request(p_from uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a uuid;
  v_b uuid;
begin
  if not exists (select 1 from public.friend_requests
                 where from_id = p_from and to_id = auth.uid()) then
    raise exception 'No such request' using errcode = '22023';
  end if;
  v_a := least(auth.uid(), p_from);
  v_b := greatest(auth.uid(), p_from);
  delete from public.friend_requests
   where (from_id = p_from and to_id = auth.uid())
      or (from_id = auth.uid() and to_id = p_from);
  insert into public.friendships (a, b) values (v_a, v_b) on conflict do nothing;
end;
$$;

create or replace function public.decline_friend_request(p_from uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.friend_requests where from_id = p_from and to_id = auth.uid();
$$;

create or replace function public.remove_friend(p_other uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.friendships
   where a = least(auth.uid(), p_other) and b = greatest(auth.uid(), p_other);
$$;

create or replace function public.my_friends()
returns table (id uuid, username text, color text, equipped jsonb)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.username, p.color, p.equipped
    from public.friendships f
    join public.profiles p
      on p.id = case when f.a = auth.uid() then f.b else f.a end
   where f.a = auth.uid() or f.b = auth.uid()
   order by p.username;
$$;

create or replace function public.my_friend_requests()
returns table (id uuid, username text, color text, equipped jsonb)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.username, p.color, p.equipped
    from public.friend_requests r
    join public.profiles p on p.id = r.from_id
   where r.to_id = auth.uid()
   order by r.created_at;
$$;

-- Username availability check that doesn't leak the whole profiles table.
create or replace function public.username_available(p_username text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from public.profiles where lower(username) = lower(p_username)
  );
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles        enable row level security;
alter table public.items           enable row level security;
alter table public.inventory       enable row level security;
alter table public.igloos          enable row level security;
alter table public.friendships     enable row level security;
alter table public.friend_requests enable row level security;

drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "create own profile" on public.profiles;
create policy "create own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "items are public" on public.items;
create policy "items are public"
  on public.items for select
  to authenticated
  using (true);

drop policy if exists "read own inventory" on public.inventory;
create policy "read own inventory"
  on public.inventory for select
  to authenticated
  using (profile_id = auth.uid());

-- Inventory is written only by buy_item() / grant_starter_items().
-- No insert/update/delete policies == no direct client writes.

-- Igloos are visitable by anyone, editable only by their owner.
drop policy if exists "igloos are visitable" on public.igloos;
create policy "igloos are visitable"
  on public.igloos for select
  to authenticated
  using (true);

drop policy if exists "decorate own igloo" on public.igloos;
create policy "decorate own igloo"
  on public.igloos for update
  to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

-- Friendships are readable by either side; all writes go through the RPCs.
drop policy if exists "read own friendships" on public.friendships;
create policy "read own friendships"
  on public.friendships for select
  to authenticated
  using (a = auth.uid() or b = auth.uid());

drop policy if exists "read own friend requests" on public.friend_requests;
create policy "read own friend requests"
  on public.friend_requests for select
  to authenticated
  using (from_id = auth.uid() or to_id = auth.uid());

grant execute on function public.create_penguin(text, text)        to authenticated;
grant execute on function public.send_friend_request(uuid)         to authenticated;
grant execute on function public.accept_friend_request(uuid)       to authenticated;
grant execute on function public.decline_friend_request(uuid)      to authenticated;
grant execute on function public.remove_friend(uuid)               to authenticated;
grant execute on function public.my_friends()                      to authenticated;
grant execute on function public.my_friend_requests()              to authenticated;
grant execute on function public.award_coins(text, integer)  to authenticated;
grant execute on function public.buy_item(text)              to authenticated;
grant execute on function public.username_available(text)    to authenticated;
