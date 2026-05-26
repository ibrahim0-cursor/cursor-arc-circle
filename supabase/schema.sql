-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/pjtkiktpdvhghkqwqpok/sql

create table if not exists nexus_decisions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  payload jsonb not null
);

create table if not exists prism_predictions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  payload jsonb not null
);

create index if not exists nexus_decisions_created_at_idx on nexus_decisions (created_at desc);
create index if not exists prism_predictions_created_at_idx on prism_predictions (created_at desc);

alter table nexus_decisions enable row level security;
alter table prism_predictions enable row level security;

create policy "Allow public read nexus" on nexus_decisions for select using (true);
create policy "Allow public insert nexus" on nexus_decisions for insert with check (true);
create policy "Allow public read prism" on prism_predictions for select using (true);
create policy "Allow public insert prism" on prism_predictions for insert with check (true);

-- Demo portfolio (per-wallet positions + trades — required for Vercel production)
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
