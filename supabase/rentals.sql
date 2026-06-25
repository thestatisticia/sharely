-- SHARELY rentals — run after schema.sql in Supabase SQL Editor

create table if not exists public.rentals (
  id text primary key,
  listing_id text not null,
  listing_title text not null,
  renter_address text not null,
  owner_address text not null,
  days integer not null check (days > 0),
  daily_rate_g numeric not null check (daily_rate_g > 0),
  total_g numeric not null,
  deposit_g numeric not null check (deposit_g >= 0),
  status text not null check (status in ('pending', 'active', 'completed')),
  booking_id text,
  tx_hash text,
  escrow_tx_hash text,
  flow_tx_hash text,
  stream_started_at timestamptz,
  start_date timestamptz not null,
  end_date timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists rentals_created_at_idx on public.rentals (created_at desc);
create index if not exists rentals_renter_idx on public.rentals (renter_address);
create index if not exists rentals_owner_idx on public.rentals (owner_address);
create index if not exists rentals_booking_idx on public.rentals (booking_id);

alter table public.rentals enable row level security;

create policy "rentals_select_public"
  on public.rentals for select
  using (true);

create policy "rentals_insert_public"
  on public.rentals for insert
  with check (true);

create policy "rentals_update_public"
  on public.rentals for update
  using (true);
