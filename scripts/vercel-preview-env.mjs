/**
 * Sync Supabase + Groq to Vercel Preview (all branches) via REST API.
 * Requires: VERCEL_TOKEN (classic PAT from https://vercel.com/account/tokens)
 * Usage: set VERCEL_TOKEN=... && node scripts/vercel-preview-env.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const token = process.env.VERCEL_TOKEN?.trim();
const projectId = "prj_STdP5AoeDZC8uISeiqXg2cn6XJPr";
const teamId = "team_apDtKK364C3BW1LjG3M93rhI";

if (!token) {
  console.error("Set VERCEL_TOKEN (classic PAT from https://vercel.com/account/tokens)");
  process.exit(1);
}

const map = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const keys = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", sensitive: false },
  { key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", sensitive: false },
  { key: "SUPABASE_SECRET_KEY", sensitive: true },
  { key: "GROQ_API_KEY", sensitive: true },
];

for (const { key, sensitive } of keys) {
  const value = map[key];
  if (!value) {
    console.log(`SKIP ${key}`);
    continue;
  }
  const res = await fetch(
    `https://api.vercel.com/v10/projects/${projectId}/env?upsert=true&teamId=${teamId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key,
        value,
        type: sensitive ? "encrypted" : "encrypted",
        target: ["preview"],
      }),
    },
  );
  const body = await res.json().catch(() => ({}));
  if (res.ok) {
    console.log(`OK ${key}`);
  } else {
    console.log(`FAIL ${key}`, res.status, JSON.stringify(body).slice(0, 200));
  }
}
