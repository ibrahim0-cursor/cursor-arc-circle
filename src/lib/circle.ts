type CircleWalletResponse = {
  data?: {
    walletId?: string;
    address?: string;
    blockchain?: string;
    state?: string;
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
    kitKeyPresent: Boolean(process.env.CIRCLE_KIT_KEY),
    baseUrl: circleBase,
    network: "Arc Testnet / Sandbox",
  };
}

export async function createCircleWallet(idempotencyKey: string) {
  const headers = circleHeaders();
  if (!headers) {
    return {
      demo: true,
      walletId: `demo-wallet-${idempotencyKey.slice(0, 8)}`,
      address: "0xDemo0000000000000000000000000000000001",
      blockchain: "ARC-TESTNET",
      state: "LIVE",
    };
  }

  const entityId = getCircleConfig()?.entityId;
  const res = await fetch(`${circleBase}/developer/wallets`, {
    method: "POST",
    headers: {
      ...headers,
      "X-Request-Id": idempotencyKey,
    },
    body: JSON.stringify({
      idempotencyKey,
      blockchains: ["ARC-TESTNET"],
      accountType: "EOA",
      walletName: "NEXUS Agent Wallet",
      entitySecretCiphertext: entityId,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.warn("Circle wallet API unavailable, using demo wallet:", text);
    return {
      demo: true,
      walletId: `demo-wallet-${idempotencyKey.slice(0, 8)}`,
      address: "0xDemo0000000000000000000000000000000001",
      blockchain: "ARC-TESTNET",
      state: "LIVE",
      fallbackReason: "Circle sandbox wallet provisioning requires entity secret setup",
    };
  }

  const json = (await res.json()) as CircleWalletResponse;
  return {
    demo: false,
    walletId: json.data?.walletId,
    address: json.data?.address,
    blockchain: json.data?.blockchain,
    state: json.data?.state,
  };
}

export async function getCircleBalances(walletId: string) {
  const headers = circleHeaders();
  if (!headers || walletId.startsWith("demo-")) {
    return {
      demo: true,
      balances: [{ currency: "USDC", amount: "1000.00" }],
    };
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
