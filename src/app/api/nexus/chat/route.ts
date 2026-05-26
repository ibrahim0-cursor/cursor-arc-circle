import { NextResponse } from "next/server";
import { getAiClient, getAiModel } from "@/lib/ai-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 45;

type ChatMessage = { role: "user" | "assistant"; content: string };

type ChatBody = {
  messages: ChatMessage[];
  token?: {
    symbol: string;
    name?: string;
    chainId: string;
    tokenAddress: string;
    priceUsd?: number;
    change24h?: number;
    volume24h?: number;
    liquidityUsd?: number;
    action?: string;
    confidence?: number;
    riskScore?: number;
    reasoning?: string;
    securityGrade?: string;
    securityLabel?: string;
    technical?: {
      rsi?: number;
      macdSignal?: string;
      trend?: string;
      score?: number;
      trendLine?: string;
    };
  };
  walletConnected?: boolean;
  agentBalanceUsdc?: number;
};

const SYSTEM = `You are NEXUS Token Copilot — expert on ONE selected token only. Answer in plain language for beginners.

Your job for this token:
1. Explain fundamentals (liquidity, volume, 24h move, chain).
2. Explain technical picture (RSI, MACD, trend) when data provided.
3. Explain why the AI signal is BUY/SELL/HOLD and what to watch (support, whales, honeypot if mentioned).
4. Help with actions: buy $X USDC, sell, one-time trade, or recurring autopilot — always remind: deposit USDC to agent vault first for autopilot.

Rules:
- Only discuss the selected token unless user asks general crypto questions.
- Never guarantee profits. Mention risks clearly.
- If security grade is C/D/F or honeypot, warn strongly before any buy.
- Be specific: cite numbers from context (price, %, confidence).
- 3-6 sentences unless user asks for short answer.

Optional action (one per reply):
- buy: { "type":"buy", "usdcAmount": number }
- sell: { "type":"sell" }
- autopilot: { "type":"autopilot", "interval":"15m", "mode":"follow_agent" }
- deposit: { "type":"deposit" }
- analyze: { "type":"analyze" }

JSON only:
{ "reply": "string", "action": null | object }`;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatBody;
    const messages = body.messages ?? [];
    if (messages.length === 0) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }

    const client = getAiClient();
    const t = body.token;
    const context = t
      ? `TOKEN ${t.symbol} (${t.name ?? t.symbol}) on ${t.chainId}
Address: ${t.tokenAddress}
Price $${t.priceUsd ?? "?"} · 24h ${t.change24h ?? "?"}%
Volume $${t.volume24h ?? "?"} · Liquidity $${t.liquidityUsd ?? "?"}
AI signal: ${t.action ?? "?"} · confidence ${t.confidence ?? "?"}% · risk ${t.riskScore ?? "?"}
Reasoning: ${t.reasoning ?? "n/a"}
Security: ${t.securityGrade ?? "?"} ${t.securityLabel ?? ""}
Technical: RSI ${t.technical?.rsi?.toFixed?.(0) ?? "?"} · MACD ${t.technical?.macdSignal ?? "?"} · trend ${t.technical?.trend ?? "?"} · score ${t.technical?.score ?? "?"}
${t.technical?.trendLine ?? ""}`
      : "No token — ask user to select from feed.";
    const walletCtx = body.walletConnected
      ? `Wallet connected. Agent vault USDC: ${body.agentBalanceUsdc ?? 0} (user must fund vault for scheduled agent).`
      : "Wallet not connected.";

    if (!client) {
      const last = messages[messages.length - 1]?.content ?? "";
      return NextResponse.json({
        reply: `On ${t?.symbol ?? "this token"}: check 24h trend and liquidity before buying. You said: "${last.slice(0, 60)}". Connect wallet and use Buy tab, or deposit to agent vault for Autopilot.`,
        action: null,
        provider: "heuristic",
      });
    }

    const completion = await client.chat.completions.create({
      model: getAiModel(),
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${SYSTEM}\n\n${context}\n${walletCtx}` },
        ...messages.slice(-12).map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { reply?: string; action?: unknown };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { reply: raw, action: null };
    }

    return NextResponse.json({
      reply: parsed.reply ?? "Done.",
      action: parsed.action ?? null,
      provider: getAiModel(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 },
    );
  }
}
