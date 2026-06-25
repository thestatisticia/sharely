-- SHARELY listing photos — run in Supabase SQL Editor after schema.sql

insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do update set public = true;

-- Public read for listing photos (uploads go through API with service role)
drop policy if exists "listing_images_select_public" on storage.objects;
create policy "listing_images_select_public"
  on storage.objects for select
  using (bucket_id = 'listing-images');
