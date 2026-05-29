/** Human-readable 6551 API errors for UI + probes. */
export function parse6551ErrorMessage(raw?: string): string {
  if (!raw?.trim()) return "6551 request failed";
  const text = raw.trim();

  if (/insufficient quota|quota exceeded|out of quota/i.test(text)) {
    return "6551 quota limit hit (points or monthly messages). Key is valid — check usage on 6551.io → Open API (free tier includes 3,000 msgs/mo). Resets daily for points; news/X resume when quota allows.";
  }

  if (/token has been refreshed|use the new token/i.test(text)) {
    return "6551 rotated your API token — copy the NEW key from 6551.io. If OPENNEWS_TOKEN or TWITTER_TOKEN exist on Vercel, update or delete them (they override API_KEY_6551). Then Redeploy Production.";
  }

  try {
    const j = JSON.parse(text) as { error?: string; msg?: string };
    const msg = String(j.error ?? j.msg ?? "");
    if (/insufficient quota|quota exceeded/i.test(msg)) {
      return "6551 quota limit (points or 3,000 msgs/mo). Copy Open API key from 6551.io → Open API tab; wait for reset or upgrade.";
    }
    if (/refreshed|new token/i.test(msg)) {
      return "6551 rotated your API token — update API_KEY_6551 on Vercel with the new key, then redeploy Production.";
    }
    if (msg) return msg.slice(0, 220);
  } catch {
    /* plain text */
  }

  return text.length > 220 ? `${text.slice(0, 217)}…` : text;
}

export function is6551TokenRotated(raw?: string): boolean {
  return /token has been refreshed|use the new token/i.test(raw ?? "");
}

export function is6551QuotaExhausted(raw?: string): boolean {
  return /insufficient quota|quota exceeded|out of quota/i.test(raw ?? "");
}
