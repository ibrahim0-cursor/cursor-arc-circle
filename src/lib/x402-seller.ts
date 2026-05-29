import { NextResponse } from "next/server";
import {
  BatchFacilitatorClient,
  GATEWAY_AUTH_VALIDITY_WINDOW_SECONDS,
} from "@circle-fin/x402-batching/server";

const BATCHING_NAME = "GatewayWalletBatched";
const BATCHING_VERSION = "1";
const BATCHING_SCHEME = "exact";

type SupportedKind = {
  x402Version: number;
  scheme: string;
  network: string;
  extra?: {
    verifyingContract?: string;
    assets?: Array<{ symbol?: string; address?: string }>;
  };
};

function sellerAddress(): string | null {
  const addr =
    process.env.X402_SELLER_ADDRESS?.trim() ||
    process.env.NEXT_PUBLIC_AGENT_VAULT_ADDRESS?.trim();
  return addr && addr.startsWith("0x") ? addr : null;
}

function facilitatorUrl(): string {
  return (
    process.env.X402_FACILITATOR_URL?.trim() ||
    "https://gateway-api-testnet.circle.com"
  );
}

function configuredNetworks(): string[] | null {
  const raw = process.env.X402_NETWORKS?.trim();
  if (!raw) return ["eip155:5042002"];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export function isX402SellerConfigured(): boolean {
  return Boolean(sellerAddress());
}

export function isInternalMeridianRequest(request: Request): boolean {
  return request.headers.get("x-meridian-client") === "nexus";
}

function getUsdcAddress(kind: SupportedKind): string | null {
  const assets = kind.extra?.assets;
  if (!assets?.length) return null;
  const usdc = assets.find((a) => a.symbol === "USDC");
  return usdc?.address ?? null;
}

function parsePrice(price: string): string {
  const numericPrice = price.replace(/[$]/g, "");
  const amount = parseFloat(numericPrice);
  if (Number.isNaN(amount) || amount <= 0) throw new Error(`Invalid price: ${price}`);
  return Math.round(amount * 1e6).toString();
}

let facilitator: BatchFacilitatorClient | null = null;
let cachedKinds: SupportedKind[] | null = null;

function getFacilitator(): BatchFacilitatorClient {
  if (!facilitator) facilitator = new BatchFacilitatorClient({ url: facilitatorUrl() });
  return facilitator;
}

async function getSupportedKinds(): Promise<SupportedKind[]> {
  if (cachedKinds) return cachedKinds;
  const supported = await getFacilitator().getSupported();
  cachedKinds = supported.kinds as SupportedKind[];
  return cachedKinds;
}

async function getAcceptedNetworks(): Promise<SupportedKind[]> {
  const nets = configuredNetworks();
  const all = await getSupportedKinds();
  return all.filter(
    (k) =>
      k.extra?.verifyingContract &&
      getUsdcAddress(k) &&
      (!nets?.length || nets.includes(k.network)),
  );
}

async function createAllPaymentRequirements(price: string, payTo: string) {
  const networks = await getAcceptedNetworks();
  const amount = parsePrice(price);
  return networks.map((kind) => ({
    scheme: BATCHING_SCHEME,
    network: kind.network,
    asset: getUsdcAddress(kind)!,
    amount,
    payTo,
    maxTimeoutSeconds: GATEWAY_AUTH_VALIDITY_WINDOW_SECONDS,
    extra: {
      name: BATCHING_NAME,
      version: BATCHING_VERSION,
      verifyingContract: kind.extra!.verifyingContract,
    },
  }));
}

async function createPaymentRequirements(price: string, payTo: string, network: string) {
  const kind = (await getAcceptedNetworks()).find((k) => k.network === network);
  if (!kind?.extra?.verifyingContract) return null;
  const asset = getUsdcAddress(kind);
  if (!asset) return null;
  return {
    scheme: BATCHING_SCHEME,
    network: kind.network,
    asset,
    amount: parsePrice(price),
    payTo,
    maxTimeoutSeconds: GATEWAY_AUTH_VALIDITY_WINDOW_SECONDS,
    extra: {
      name: BATCHING_NAME,
      version: BATCHING_VERSION,
      verifyingContract: kind.extra.verifyingContract,
    },
  };
}

export type X402Gate =
  | { ok: true; payer?: string; transaction?: string }
  | { ok: false; response: NextResponse };

/**
 * Internal NEXUS UI bypasses when x-meridian-client: nexus.
 * External agents must send payment-signature (Circle Gateway x402).
 */
export async function checkX402Payment(
  request: Request,
  opts: { price: string; resourcePath: string; description: string },
): Promise<X402Gate> {
  const payTo = sellerAddress();
  if (!payTo) return { ok: true };
  if (isInternalMeridianRequest(request)) return { ok: true };

  const paymentHeader = request.headers.get("payment-signature");
  if (!paymentHeader) {
    try {
      const accepts = await createAllPaymentRequirements(opts.price, payTo);
      if (!accepts.length) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: "No x402 payment networks available" },
            { status: 503 },
          ),
        };
      }
      const paymentRequired = {
        x402Version: 2,
        resource: {
          url: opts.resourcePath,
          description: opts.description,
          mimeType: "application/json",
        },
        accepts,
      };
      const encoded = Buffer.from(JSON.stringify(paymentRequired)).toString("base64");
      return {
        ok: false,
        response: new NextResponse(
          JSON.stringify({ error: "Payment required", x402: true, price: opts.price }),
          {
            status: 402,
            headers: {
              "Content-Type": "application/json",
              "PAYMENT-REQUIRED": encoded,
            },
          },
        ),
      };
    } catch (e) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: "x402 setup failed",
            message: e instanceof Error ? e.message : "unknown",
          },
          { status: 503 },
        ),
      };
    }
  }

  try {
    const paymentPayload = JSON.parse(
      Buffer.from(paymentHeader, "base64").toString("utf-8"),
    ) as { accepted?: { network?: string } };
    const network = paymentPayload.accepted?.network;
    if (!network) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Missing accepted.network in payment" }, { status: 400 }),
      };
    }
    const requirements = await createPaymentRequirements(opts.price, payTo, network);
    if (!requirements) {
      return {
        ok: false,
        response: NextResponse.json({ error: `Network ${network} not accepted` }, { status: 400 }),
      };
    }

    const fac = getFacilitator();
    const verifyResult = await fac.verify(
      paymentPayload as Parameters<BatchFacilitatorClient["verify"]>[0],
      requirements,
    );
    if (!verifyResult.isValid) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Payment verification failed", reason: verifyResult.invalidReason },
          { status: 402 },
        ),
      };
    }
    const settleResult = await fac.settle(
      paymentPayload as Parameters<BatchFacilitatorClient["settle"]>[0],
      requirements,
    );
    if (!settleResult.success) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Payment settlement failed", reason: settleResult.errorReason },
          { status: 402 },
        ),
      };
    }

    return {
      ok: true,
      payer: settleResult.payer ?? verifyResult.payer,
      transaction: settleResult.transaction,
    };
  } catch (e) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Payment processing error",
          message: e instanceof Error ? e.message : "unknown",
        },
        { status: 500 },
      ),
    };
  }
}

export async function withX402Guard<T>(
  request: Request,
  opts: { price: string; resourcePath: string; description: string },
  handler: () => Promise<T>,
): Promise<T | NextResponse> {
  const gate = await checkX402Payment(request, opts);
  if (!gate.ok) return gate.response;
  return handler();
}
