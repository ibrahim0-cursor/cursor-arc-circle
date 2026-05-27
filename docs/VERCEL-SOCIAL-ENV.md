# Vercel environment — social & narrative APIs

Sync all keys from `.env.local` to Vercel (production + preview + development):

```powershell
cd c:\Users\hp\Projects\cursor-arc-circle
.\scripts\deploy-vercel.ps1
```

Or preview/dev only:

```powershell
.\scripts\sync-vercel-env.ps1
```

## Required for core app

| Variable | Purpose |
|----------|---------|
| `BIRDEYE_API_KEY` | Whales, holders, on-chain intel |
| `GROQ_API_KEY` | AI thesis / reasoning |
| `NEXT_PUBLIC_SUPABASE_*` + `SUPABASE_SECRET_KEY` | Agent memory |

## Discord (your app "arc")

1. **OAuth2** (screenshot) — `DISCORD_CLIENT_ID` + `DISCORD_CLIENT_SECRET` for future user login. Redirect in portal: `https://trader-arc.vercel.app/api/auth/discord/callback` (when you add auth).
2. **Bot token** (Developer Portal → **Bot** → Reset Token) — set `DISCORD_BOT_TOKEN`.
3. Enable **Message Content Intent** under Bot → Privileged Gateway Intents.
4. Invite bot to servers; copy each **Server ID** → `DISCORD_GUILD_IDS` (comma-separated).
5. Redeploy Vercel after saving env vars.

OAuth alone does **not** read channel messages — you need the bot token.

## Telegram

1. Message [@BotFather](https://t.me/BotFather) → `/newbot` → copy token → `TELEGRAM_BOT_TOKEN`.
2. Add the bot to groups/channels where you want mention velocity.
3. Bot only sees messages **after** it joins (via `getUpdates` on each scan).

## Stocktwits

Enterprise Basic auth: `STOCKTWITS_USERNAME` + `STOCKTWITS_PASSWORD` from Stocktwits.

## RapidAPI Twitter (optional)

1. Subscribe to a Twitter search API on [rapidapi.com](https://rapidapi.com/search/twitter).
2. Set `RAPIDAPI_KEY` and `RAPIDAPI_TWITTER_HOST` (exact host from the API page).
3. If search path differs, set `RAPIDAPI_TWITTER_SEARCH_PATH`.

## Security

Never commit `.env.local`. Rotate any key pasted in chat.
