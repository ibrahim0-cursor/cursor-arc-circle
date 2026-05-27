#!/usr/bin/env node
/** Updates .env.local Supabase keys from env vars (run with secrets in shell, not committed). */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const path = join(root, ".env.local");
const updates = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_AGENT_VAULT_ADDRESS:
    process.env.NEXT_PUBLIC_AGENT_VAULT_ADDRESS ?? "0x11c1695A3AC5EF9d0B92572f0730F7AC3C87A715",
};

let lines = readFileSync(path, "utf8").split(/\r?\n/);
const keys = new Set(Object.keys(updates).filter((k) => updates[k]));
for (const key of keys) {
  const val = updates[key];
  const idx = lines.findIndex((l) => l.startsWith(`${key}=`));
  const row = `${key}=${val}`;
  if (idx >= 0) lines[idx] = row;
  else lines.push(row);
}
writeFileSync(path, lines.filter((l, i, a) => l !== "" || i < a.length - 1).join("\n") + "\n", "utf8");
console.log("Updated .env.local keys:", [...keys].join(", "));
