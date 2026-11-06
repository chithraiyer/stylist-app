-- Adds a region to the stylist's shopping links (e.g. "USA", "India", "Anywhere").
-- Run once in Supabase → SQL Editor. Safe to run more than once.
alter table public.kb_items add column if not exists region text;
