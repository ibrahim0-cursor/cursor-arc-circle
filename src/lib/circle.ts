type CircleWalletResponse = {
  data?: {
    walletId?: string;
    address?: string;
    blockchain?: string;
    state?: string;
    wallets?: Array<{
      id?: string;
      address?: string;
      blockchain?: string;
      state?: string;
      refId?: string;
    }>;
  };
};

function getCircleConfig() {
  const raw = process.env.CIRCLE_API_KEY ?? "";
  const parts = raw.split(":");
  if (parts.length >= 3) {
    return {
      entityId: parts[0],
      apiKey: parts[1],
      secret: parts.slice(2).join(":"),
    };
  }
  return null;
}

function circleHeaders() {
  const config = getCircleConfig();
  if (!config) return null;
  const token = Buffer.from(`${config.apiKey}:${config.secret}`).toString("base64");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

const circleBase =
  process.env.CIRCLE_API_BASE ?? "https://api-sandbox.circle.com/v1/w3s";

export async function getCircleStatus() {
  const configured = Boolean(getCircleConfig());
  return {
    configured,
    walletSetConfigured: Boolean(process.env.CIRCLE_WALLET_SET_ID),
    entitySecretConfigured: Boolean(process.env.CIRCLE_ENTITY_SECRET_CIPHERTEXT),
    kitKeyPresent: Boolean(process.env.CIRCLE_KIT_KEY),
    baseUrl: circleBase,
    network: "Arc Testnet / Sandbox",
  };
}

export async function createCircleWallet(idempotencyKey: string, refId?: string) {
  const headers = circleHeaders();
  const walletSetId = process.env.CIRCLE_WALLET_SET_ID;
  const entitySecretCiphertext = process.env.CIRCLE_ENTITY_SECRET_CIPHERTEXT;

  if (!headers || !walletSetId || !entitySecretCiphertext) {
    return {
      demo: true,
      walletId: null,
      address: null,
      blockchain: "ARC-TESTNET",
      state: "UNCONFIGURED",
      fallbackReason:
        "Circle wallet needs CIRCLE_API_KEY, CIRCLE_WALLET_SET_ID, and CIRCLE_ENTITY_SECRET_CIPHERTEXT on Vercel",
    };
  }

  const res = await fetch(`${circleBase}/developer/wallets`, {
    method: "POST",
    headers: {
      ...headers,
      "X-Request-Id": idempotencyKey,
    },
    body: JSON.stringify({
      idempotencyKey,
      walletSetId,
      blockchains: ["ARC-TESTNET"],
      count: 1,
      accountType: "EOA",
      entitySecretCiphertext,
      metadata: refId
        ? [{ name: "NEXUS Agent", refId: refId.slice(0, 50) }]
        : [{ name: "NEXUS Agent", refId: idempotencyKey.slice(0, 36) }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.warn("Circle wallet API failed:", text);
    return {
      demo: true,
      walletId: null,
      address: null,
      blockchain: "ARC-TESTNET",
      state: "ERROR",
      fallbackReason: text.slice(0, 200),
    };
  }

  const json = (await res.json()) as CircleWalletResponse;
  const w = json.data?.wallets?.[0];
  return {
    demo: false,
    walletId: w?.id ?? json.data?.walletId,
    address: w?.address ?? json.data?.address,
    blockchain: w?.blockchain ?? json.data?.blockchain,
    state: w?.state ?? json.data?.state,
  };
}

export async function getCircleBalances(walletId: string) {
  const headers = circleHeaders();
  if (!headers || !walletId || walletId.startsWith("demo-")) {
    return { demo: true, balances: [{ currency: "USDC", amount: "0.00" }] };
  }

  const res = await fetch(`${circleBase}/wallets/${walletId}/balances`, {
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    return { demo: true, balances: [{ currency: "USDC", amount: "0.00" }] };
  }

  const json = (await res.json()) as {
    data?: { tokenBalances?: Array<{ token?: { symbol?: string }; amount?: string }> };
  };

  return {
    demo: false,
    balances: (json.data?.tokenBalances ?? []).map((item) => ({
      currency: item.token?.symbol ?? "USDC",
      amount: item.amount ?? "0",
    })),
  };
}
