-- Run if listing availability updates fail (mark rented / available again)

create policy "listings_update_public"
  on public.listings for update
  using (true);
