/** HTTP security headers for MERIDIAN (Vercel production + local dev). */

export const MERIDIAN_SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      "frame-src https://dexscreener.com https://*.dexscreener.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

export const OFFICIAL_APP_HOSTS = [
  "trader-arc.vercel.app",
  "localhost",
  "127.0.0.1",
] as const;

export function isOfficialMeridianHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return OFFICIAL_APP_HOSTS.some((allowed) => h === allowed || h.endsWith(`.${allowed}`));
}
