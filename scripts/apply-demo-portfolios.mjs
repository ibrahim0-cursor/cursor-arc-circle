#!/usr/bin/env node
/**
 * Create demo_portfolios table in Supabase.
 *
 * Option A — add to .env.local (recommended):
 *   SUPABASE_DB_URL=postgresql://postgres.[ref]:[PASSWORD]@aws-0-....pooler.supabase.com:6543/postgres
 *   (Dashboard → Settings → Database → Connection string → URI)
 *
 * Option B — personal access token:
 *   SUPABASE_ACCESS_TOKEN=...  (Dashboard → Account → Access Tokens)
 *   SUPABASE_PROJECT_REF=pjtkiktpdvhghkqwqpok
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const sqlPath = join(root, "supabase", "demo_portfolios_only.sql");
const sql = readFileSync(sqlPath, "utf8");
const statements = sql
  .split(";")
  .map((s) => s.replace(/--[^\n]*/g, "").trim())
  .filter(Boolean);

function resolveDbUrl() {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) return null;
  const ref =
    process.env.SUPABASE_PROJECT_REF ??
    process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!ref) return null;
  const host =
    process.env.SUPABASE_DB_HOST ?? `aws-0-us-east-1.pooler.supabase.com`;
  const enc = encodeURIComponent(password);
  return `postgresql://postgres.${ref}:${enc}@${host}:6543/postgres`;
}

async function viaPostgres() {
  const url = resolveDbUrl();
  if (!url) return false;

  let pg;
  try {
    pg = await import("pg");
  } catch {
    console.error("Install pg: npm install pg --save-dev");
    process.exit(1);
  }

  const client = new pg.default.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  for (const statement of statements) {
    await client.query(statement);
  }
  await client.end();
  return true;
}

async function viaManagementApi() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref =
    process.env.SUPABASE_PROJECT_REF ??
    (process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? null);
  if (!token || !ref) return false;

  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Management API ${res.status}: ${body.slice(0, 400)}`);
  }
  return true;
}

async function main() {
  console.log("Applying demo_portfolios schema…\n");

  if (await viaPostgres()) {
    console.log("OK — applied via SUPABASE_DB_URL");
    return;
  }

  try {
    if (await viaManagementApi()) {
      console.log("OK — applied via SUPABASE_ACCESS_TOKEN");
      return;
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  console.error(`
Cannot run SQL automatically — no database credentials in .env.local.

Quick fix (pick one):

1) Add your database password, then re-run:
   npm run setup:portfolio

   Dashboard → Settings → Database → Database password
   Add to .env.local: SUPABASE_DB_PASSWORD=your-password
   (Or full URI: SUPABASE_DB_URL=postgresql://...)

2) Or add a personal access token:
   SUPABASE_ACCESS_TOKEN=...
   SUPABASE_PROJECT_REF=pjtkiktpdvhghkqwqpok

3) Or paste this file in SQL Editor:
   https://supabase.com/dashboard/project/pjtkiktpdvhghkqwqpok/sql/new
   File: supabase/demo_portfolios_only.sql
`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
