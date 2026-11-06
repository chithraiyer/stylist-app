-- =====================================================================
-- Stylist app database. Paste this whole file into
-- Supabase → SQL Editor → New query → Run. Safe to run more than once.
-- =====================================================================

-- ---------- Client accounts & plan ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  looks_used int not null default 0,
  subscription_status text not null default 'none',   -- none | active | trialing | past_due | canceled
  stripe_customer_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  last_active_at timestamptz
);

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- App settings (one row) ----------
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  brand_name text not null default 'Your Stylist',
  stylist_name text not null default 'your stylist',
  tagline text not null default 'Personal styling for every occasion',
  free_looks int not null default 3,
  monthly_price_usd numeric not null default 5,
  learnings text not null default '',
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ---------- Stylist knowledge base ----------
create table if not exists public.kb_items (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('look','guide','link')),
  title text not null,
  tags text,
  notes text,
  body text,
  url text,
  image_path text,             -- in the public 'kb-images' bucket
  created_at timestamptz not null default now()
);

-- ---------- A client's AI first look ----------
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  form jsonb not null,
  photo_paths text[] not null default '{}',   -- in the PRIVATE 'client-photos' bucket
  photo_labels text[] not null default '{}',
  result jsonb,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_idx on public.sessions(user_id, created_at desc);

-- ---------- Personal review requests to the stylist ----------
create table if not exists public.review_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  message text,
  status text not null default 'pending' check (status in ('pending','answered')),
  reply text,
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  unique (session_id)
);

-- ---------- Feedback on every suggestion ----------
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('ai','stylist')),
  session_id uuid references public.sessions(id) on delete cascade,
  request_id uuid references public.review_requests(id) on delete cascade,
  rating text not null check (rating in ('up','down')),
  comment text,
  created_at timestamptz not null default now()
);
create unique index if not exists feedback_one_ai on public.feedback(user_id, session_id) where kind = 'ai';
create unique index if not exists feedback_one_stylist on public.feedback(user_id, request_id) where kind = 'stylist';

-- =====================================================================
-- Row Level Security
-- Clients can only ever READ their own rows. All writes and all stylist
-- access go through the website's server, which checks who is asking.
-- =====================================================================
alter table public.profiles        enable row level security;
alter table public.settings        enable row level security;
alter table public.kb_items        enable row level security;
alter table public.sessions        enable row level security;
alter table public.review_requests enable row level security;
alter table public.feedback        enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for select using (auth.uid() = id);

drop policy if exists "settings readable" on public.settings;
create policy "settings readable" on public.settings for select using (true);

drop policy if exists "kb readable" on public.kb_items;
create policy "kb readable" on public.kb_items for select using (true);

drop policy if exists "own sessions" on public.sessions;
create policy "own sessions" on public.sessions for select using (auth.uid() = user_id);

drop policy if exists "own requests" on public.review_requests;
create policy "own requests" on public.review_requests for select using (auth.uid() = user_id);

drop policy if exists "own feedback" on public.feedback;
create policy "own feedback" on public.feedback for select using (auth.uid() = user_id);

-- =====================================================================
-- Storage
--  client-photos : PRIVATE. No public access and no browser access at all.
--                  The server hands out short-lived signed links only to
--                  the photo's owner, or to the stylist when the owner
--                  asked for a personal review.
--  kb-images     : public, for the stylist's sample looks.
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('client-photos', 'client-photos', false)
on conflict (id) do update set public = false;

insert into storage.buckets (id, name, public)
values ('kb-images', 'kb-images', true)
on conflict (id) do update set public = true;
