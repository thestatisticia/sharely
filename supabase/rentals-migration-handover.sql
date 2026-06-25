-- SHARELY rentals handover column — run if delivery confirm fails
-- ("Could not update rental on server")

alter table public.rentals
  add column if not exists owner_handover_at timestamptz;

drop policy if exists "rentals_update_public" on public.rentals;
create policy "rentals_update_public"
  on public.rentals for update
  using (true);
