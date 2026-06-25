-- Remove demo / placeholder listings from Supabase (safe to run)
-- Run in SQL Editor → New query → Run

delete from public.listings
where id like 'seed-%'
   or owner_address ~ '^0x0{39}[0-9a-f]$'
   or image_url like '%images.unsplash.com/photo-1504148455328%'
   or image_url like '%images.unsplash.com/photo-1478131143081%'
   or image_url like '%images.unsplash.com/photo-1598488035139%'
   or image_url like '%images.unsplash.com/photo-1581578731548%'
   or image_url like '%images.unsplash.com/photo-1621905251189%'
   or image_url like '%images.unsplash.com/photo-1607408497555%';
