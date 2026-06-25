-- SHARELY listings — run in Supabase SQL Editor (new project)

create table if not exists public.listings (
  id text primary key,
  title text not null,
  description text not null,
  category text not null check (
    category in ('tools', 'electronics', 'sports', 'home', 'other')
  ),
  image_url text not null,
  daily_rate_g numeric not null check (daily_rate_g > 0),
  deposit_g numeric not null check (deposit_g >= 0),
  location text not null,
  area text,
  distance_km numeric not null default 0.5,
  owner_address text not null,
  owner_name text not null,
  available boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists listings_created_at_idx on public.listings (created_at desc);
create index if not exists listings_area_idx on public.listings (area);
create index if not exists listings_owner_idx on public.listings (owner_address);

alter table public.listings enable row level security;

-- Beta: public read + insert (tighten before wide launch)
create policy "listings_select_public"
  on public.listings for select
  using (true);

create policy "listings_insert_public"
  on public.listings for insert
  with check (true);

create policy "listings_update_public"
  on public.listings for update
  using (true);

-- Optional: Storage bucket for photos (Dashboard → Storage → New bucket: listing-images, public)
-- Then use Supabase Storage URLs instead of Google Drive links.
