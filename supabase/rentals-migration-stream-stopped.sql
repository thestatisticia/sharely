-- Run in Supabase SQL Editor if stream_stopped_at is missing

alter table public.rentals
  add column if not exists stream_stopped_at timestamptz;
