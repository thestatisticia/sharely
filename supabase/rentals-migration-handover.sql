-- Run in Supabase SQL Editor if rentals table already exists

alter table public.rentals
  add column if not exists owner_handover_at timestamptz;

-- Optional: index for active rental lookups by listing
create index if not exists rentals_listing_idx on public.rentals (listing_id);
