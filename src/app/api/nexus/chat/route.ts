import { NextResponse } from "next/server";
import { getAiClient, getAiModel } from "@/lib/ai-client";
import {
  buildNexusChatContextLite,
  formatNexusChatContextForAi,
  sanitizeChatReply,
} from "@/lib/nexus-chat-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type ChatMessage = { role: "user" | "assistant"; content: string };

type ChatBody = {
  messages: ChatMessage[];
  token?: {
    symbol?: string;
    chainId: string;
    tokenAddress: string;
  };
  walletConnected?: boolean;
  agentBalanceUsdc?: number;
};

const SYSTEM = `You are NEXUS Token Copilot — expert on ONE selected token only. Answer in plain language for beginners.

Your job for this token:
1. Explain fundamentals (liquidity, volume, 24h move, chain) using ONLY the verified live snapshot.
2. Explain technical picture (RSI, MACD, trend) only when those values appear in the snapshot (not n/a).
3. Explain why the AI signal is BUY/SELL/HOLD and what to watch — cite confidence and risk from snapshot.
4. Help with actions: buy $X USDC, sell, one-time trade, or recurring autopilot — remind: deposit USDC to agent vault first for autopilot.

Rules:
- Only discuss the selected token unless user asks general crypto questions.
- Never guarantee profits. Mention risks clearly.
- If security grade is C/D/F or honeypot flags appear, warn strongly before any buy.
- Be specific: cite numbers from the VERIFIED LIVE SNAPSHOT only.
- If data is missing, say "not available in live feed" — NEVER invent prices, holder addresses, whale names, or TA values.
- Do NOT mention charts, chart links, DexScreener embeds, TradingView, or tell the user to "open the chart". Intel is text-only in chat.
- 3-6 sentences unless user asks for short answer.

Optional action (one per reply):
- buy: { "type":"buy", "usdcAmount": number }
- sell: { "type":"sell" }
- autopilot: { "type":"autopilot", "interval":"15m", "mode":"follow_agent" }
- deposit: { "type":"deposit" }

JSON only:
{ "reply": "string", "action": null | object }`;

function heuristicReply(
  ctx: Awaited<ReturnType<typeof buildNexusChatContextLite>>,
  lastUser: string,
): string {
  if (!ctx) return "Token not found on DexScreener — pick another from the live feed.";
  const t = ctx.token;
  const a = ctx.agent;
  return `${t.symbol} is $${t.priceUsd.toFixed(t.priceUsd < 1 ? 6 : 4)} (${t.change24h >= 0 ? "+" : ""}${t.change24h.toFixed(2)}% 24h). Liquidity $${Math.round(t.liquidityUsd).toLocaleString()}, vol $${Math.round(t.volume24h).toLocaleString()}. Signal: ${a.action} at ${a.confidence}% confidence, risk ${a.riskScore}/100. ${a.whyAction ?? ""} You asked: "${lastUser.slice(0, 80)}". Use Buy/Sell tabs to trade; fund the agent vault for autopilot.`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatBody;
    const messages = body.messages ?? [];
    if (messages.length === 0) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }

    const t = body.token;
    if (!t?.chainId || !t?.tokenAddress) {
      return NextResponse.json({ error: "token chainId and tokenAddress required" }, { status: 400 });
    }

    const ctx = await buildNexusChatContextLite(t.chainId, t.tokenAddress);
    const context = ctx ? formatNexusChatContextForAi(ctx) : "Token not found — do not invent data.";
    const walletCtx = body.walletConnected
      ? `Wallet connected. Agent vault USDC: ${body.agentBalanceUsdc ?? 0} (user must fund vault for scheduled agent).`
      : "Wallet not connected.";

    const client = getAiClient();
    const last = messages[messages.length - 1]?.content ?? "";

    if (!client) {
      return NextResponse.json({
        reply: sanitizeChatReply(heuristicReply(ctx, last)),
        action: null,
        provider: "heuristic",
        refreshedAt: ctx?.refreshedAt,
      });
    }

    const completion = await client.chat.completions.create({
      model: getAiModel(),
      temperature: 0.25,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${SYSTEM}\n\n${context}\n${walletCtx}` },
        ...messages.slice(-12).map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { reply?: string; action?: { type?: string } };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { reply: raw, action: undefined };
    }

    const action = parsed.action;
    if (action?.type === "analyze") {
      delete (action as { type?: string }).type;
    }

    return NextResponse.json({
      reply: sanitizeChatReply(parsed.reply ?? "Done."),
      action: action?.type ? action : null,
      provider: getAiModel(),
      refreshedAt: ctx?.refreshedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 },
    );
  }
}
