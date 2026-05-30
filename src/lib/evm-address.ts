/** Shared EVM address validation for API routes and forms. */

export function isValidEvmAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

export function normalizeEvmAddress(value: string): string | null {
  const trimmed = value.trim();
  if (!isValidEvmAddress(trimmed)) return null;
  return trimmed.toLowerCase();
}
