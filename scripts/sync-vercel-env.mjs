/**
 * Sync non-empty keys from .env.local → Vercel (production + development).
 * Usage: node scripts/sync-vercel-env.mjs
 * Does not print secret values.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const envPath = path.join(root, ".env.local");
if (!fs.existsSync(envPath)) {
  console.error("Missing .env.local");
  process.exit(1);
}

const vars = {};
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i < 1) continue;
  const key = line.slice(0, i).trim();
  let val = line.slice(i + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  if (val) vars[key] = val;
}

const targets = ["production", "development"];
let ok = 0;
let fail = 0;

for (const target of targets) {
  for (const [key, value] of Object.entries(vars)) {
    try {
      execSync(`npx vercel env add ${key} ${target} --value ${JSON.stringify(value)} --yes --force`, {
        cwd: root,
        stdio: "pipe",
        encoding: "utf8",
        timeout: 120_000,
      });
      console.log(`✓ ${key} → ${target}`);
      ok++;
    } catch (e) {
      const msg = (e.stderr || e.stdout || e.message || "").slice(0, 120);
      console.log(`✗ ${key} → ${target}: ${msg.replace(/\s+/g, " ")}`);
      fail++;
    }
  }
}

console.log(`Done: ${ok} synced, ${fail} issues (${Object.keys(vars).length} keys × ${targets.length} envs)`);
