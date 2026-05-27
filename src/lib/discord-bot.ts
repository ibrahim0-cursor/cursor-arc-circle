/**
 * Discord Bot API — guild message search for narrative signals.
 * OAuth Client ID/Secret (Developer Portal → OAuth2) is for user login only.
 * For Alpha intel you need a Bot token (Bot → Reset Token) + invite bot to servers.
 */

export type DiscordPulseItem = {
  title: string;
  channel?: string;
  link?: string;
  author?: string;
};

const API = "https://discord.com/api/v10";

function cleanEnv(raw?: string): string | undefined {
  if (!raw) return undefined;
  const v = raw.trim().replace(/^['"]|['"]$/g, "");
  return v.length > 0 ? v : undefined;
}

export function hasDiscordBotToken(): boolean {
  return Boolean(cleanEnv(process.env.DISCORD_BOT_TOKEN));
}

export function hasDiscordOAuthClient(): boolean {
  return Boolean(cleanEnv(process.env.DISCORD_CLIENT_ID));
}

function botHeaders(): Record<string, string> | null {
  const token = cleanEnv(process.env.DISCORD_BOT_TOKEN);
  if (!token) return null;
  return {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  };
}

function guildIds(): string[] {
  const raw = cleanEnv(process.env.DISCORD_GUILD_IDS) ?? cleanEnv(process.env.DISCORD_GUILD_ID);
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export async function probeDiscord(): Promise<{
  ok: boolean;
  configured: boolean;
  oauthClient?: boolean;
  error?: string;
}> {
  const oauthClient = hasDiscordOAuthClient();
  if (!hasDiscordBotToken()) {
    return {
      ok: false,
      configured: false,
      oauthClient,
      error: oauthClient
        ? "DISCORD_CLIENT_ID set — add DISCORD_BOT_TOKEN for message search"
        : "DISCORD_BOT_TOKEN not set",
    };
  }
  const headers = botHeaders();
  if (!headers) return { ok: false, configured: false, oauthClient };

  try {
    const res = await fetch(`${API}/users/@me`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return { ok: false, configured: true, oauthClient, error: `HTTP ${res.status}` };
    }
    return { ok: true, configured: true, oauthClient };
  } catch {
    return { ok: false, configured: true, oauthClient, error: "request failed" };
  }
}

export async function fetchDiscordBuzz(topic: string): Promise<DiscordPulseItem[]> {
  const headers = botHeaders();
  const guilds = guildIds();
  if (!headers || guilds.length === 0) return [];

  const q = topic.replace(/^\$/, "").trim();
  if (q.length < 2) return [];

  const out: DiscordPulseItem[] = [];

  for (const guildId of guilds.slice(0, 3)) {
    try {
      const params = new URLSearchParams({
        content: q,
        limit: "5",
      });
      const res = await fetch(`${API}/guilds/${guildId}/messages/search?${params}`, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(9000),
      });
      if (!res.ok) continue;

      const json = (await res.json()) as {
        messages?: Array<
          Array<{
            content?: string;
            id?: string;
            channel_id?: string;
            author?: { username?: string };
          }>
        >;
      };

      for (const batch of json.messages ?? []) {
        for (const m of batch) {
          const content = (m.content ?? "").trim();
          if (!content) continue;
          out.push({
            title: content.slice(0, 160),
            channel: m.channel_id,
            author: m.author?.username,
            link:
              m.channel_id && m.id
                ? `https://discord.com/channels/${guildId}/${m.channel_id}/${m.id}`
                : undefined,
          });
          if (out.length >= 4) return out;
        }
      }
    } catch {
      continue;
    }
  }

  return out;
}
