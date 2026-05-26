-- Paste into Supabase SQL Editor if portfolio does not persist on Vercel/mobile.
-- Full schema: supabase/schema.sql

create table if not exists demo_portfolios (
  wallet text primary key,
  updated_at timestamptz not null default now(),
  positions jsonb not null default '[]'::jsonb,
  trades jsonb not null default '[]'::jsonb
);

create index if not exists demo_portfolios_updated_idx on demo_portfolios (updated_at desc);

alter table demo_portfolios enable row level security;

create policy "Allow public read demo_portfolios" on demo_portfolios for select using (true);
create policy "Allow public insert demo_portfolios" on demo_portfolios for insert with check (true);
create policy "Allow public update demo_portfolios" on demo_portfolios for update using (true) with check (true);
