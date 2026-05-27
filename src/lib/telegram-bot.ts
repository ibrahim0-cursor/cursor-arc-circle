/**
 * Telegram Bot API — community narrative (optional TELEGRAM_BOT_TOKEN).
 * Add the bot to crypto groups/channels; recent updates mentioning a symbol boost Alpha narrative.
 */

export type TelegramPulseItem = {
  title: string;
  chatTitle?: string;
  link?: string;
};

function cleanEnv(raw?: string): string | undefined {
  if (!raw) return undefined;
  const v = raw.trim().replace(/^['"]|['"]$/g, "");
  return v.length > 0 ? v : undefined;
}

export function hasTelegramBotToken(): boolean {
  return Boolean(cleanEnv(process.env.TELEGRAM_BOT_TOKEN));
}

function botBase(): string | null {
  const token = cleanEnv(process.env.TELEGRAM_BOT_TOKEN);
  if (!token) return null;
  return `https://api.telegram.org/bot${token}`;
}

async function tgFetch<T>(method: string, params?: Record<string, string>): Promise<T | null> {
  const base = botBase();
  if (!base) return null;
  const url = new URL(`${base}/${method}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  try {
    const res = await fetch(url.toString(), { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { ok?: boolean; result?: T };
    return json.ok ? (json.result ?? null) : null;
  } catch {
    return null;
  }
}

export async function probeTelegram(): Promise<{ ok: boolean; configured: boolean; error?: string }> {
  if (!hasTelegramBotToken()) {
    return { ok: false, configured: false, error: "TELEGRAM_BOT_TOKEN not set" };
  }
  const me = await tgFetch<{ username?: string }>("getMe");
  if (!me?.username) return { ok: false, configured: true, error: "getMe failed" };
  return { ok: true, configured: true };
}

/** Scan recent bot updates for messages mentioning the topic (symbol/name). */
export async function fetchTelegramBuzz(
  topic: string,
  name?: string,
): Promise<TelegramPulseItem[]> {
  if (!hasTelegramBotToken()) return [];

  const terms = [
    topic.replace(/^\$/, "").trim(),
    name?.trim(),
  ].filter(Boolean) as string[];
  if (terms.length === 0) return [];

  const lowerTerms = terms.map((t) => t.toLowerCase()).filter((t) => t.length >= 2);

  const updates = await tgFetch<
    Array<{
      message?: {
        text?: string;
        caption?: string;
        chat?: { title?: string; username?: string; id?: number };
        message_id?: number;
      };
    }>
  >("getUpdates", { limit: "50", timeout: "0" });

  if (!updates?.length) return [];

  const out: TelegramPulseItem[] = [];
  for (const u of updates) {
    const msg = u.message;
    if (!msg) continue;
    const text = (msg.text ?? msg.caption ?? "").trim();
    if (!text) continue;
    const hay = text.toLowerCase();
    if (!lowerTerms.some((t) => hay.includes(t))) continue;
    const chat = msg.chat;
    const username = chat?.username;
    const link =
      username && msg.message_id
        ? `https://t.me/${username}/${msg.message_id}`
        : undefined;
    out.push({
      title: text.slice(0, 160),
      chatTitle: chat?.title ?? (username ? `@${username}` : "Telegram"),
      link,
    });
    if (out.length >= 4) break;
  }
  return out;
}
