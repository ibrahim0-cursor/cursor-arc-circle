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

-- Agent vault balances (per-wallet credits for Autopilot)
create table if not exists agent_vault_ledgers (
  wallet text primary key,
  updated_at timestamptz not null default now(),
  ledger jsonb not null default '{}'::jsonb
);

alter table agent_vault_ledgers enable row level security;
create policy "Allow public read agent_vault_ledgers" on agent_vault_ledgers for select using (true);
create policy "Allow public insert agent_vault_ledgers" on agent_vault_ledgers for insert with check (true);
create policy "Allow public update agent_vault_ledgers" on agent_vault_ledgers for update using (true) with check (true);

create table if not exists agent_vault_meta (
  id text primary key,
  updated_at timestamptz not null default now(),
  ledgers jsonb not null default '{}'::jsonb,
  last_scanned_block text
);

alter table agent_vault_meta enable row level security;
create policy "Allow public read agent_vault_meta" on agent_vault_meta for select using (true);
create policy "Allow public insert agent_vault_meta" on agent_vault_meta for insert with check (true);
create policy "Allow public update agent_vault_meta" on agent_vault_meta for update using (true) with check (true);
