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

-- Case-insensitive unique penguin names.
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

create table if not exists public.items (
  id    text primary key,
  name  text not null,
  slot  text not null check (slot in ('color', 'hat', 'shirt', 'neck', 'hand', 'feet')),
  cost  integer not null check (cost >= 0)
);

create table if not exists public.inventory (
  profile_id  uuid not null references public.profiles on delete cascade,
  item_id     text not null references public.items on delete cascade,
  acquired_at timestamptz not null default now(),
  primary key (profile_id, item_id)
);

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
  ('feet_skis',        'Tiny Skis',       'feet',  280)
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

-- New penguins start owning the free blue colour.
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
  return new;
end;
$$;

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

alter table public.profiles  enable row level security;
alter table public.items     enable row level security;
alter table public.inventory enable row level security;

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

grant execute on function public.create_penguin(text, text)  to authenticated;
grant execute on function public.award_coins(text, integer)  to authenticated;
grant execute on function public.buy_item(text)              to authenticated;
grant execute on function public.username_available(text)    to authenticated;
