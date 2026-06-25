-- Run if "Hide from Explore" does not remove items from browse/home

alter table public.listings
  add column if not exists hidden_by_owner boolean not null default false;

drop policy if exists "listings_update_public" on public.listings;
create policy "listings_update_public"
  on public.listings for update
  using (true);

-- Optional: mark items you already hid (available=false, not actively rented)
-- update public.listings set hidden_by_owner = true where available = false;
