function normalizePem(raw: string): string {
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

export function isDomainConnectEnabled(): boolean {
  return process.env.DOMAIN_CONNECT_ENABLED === "true";
}

export function getDomainConnectPrivateKeyPem(): string | null {
  const raw = process.env.DOMAIN_CONNECT_PRIVATE_KEY?.trim();
  if (!raw) return null;
  return normalizePem(raw);
}

export function getDomainConnectKeyHost(): string | null {
  return process.env.DOMAIN_CONNECT_KEY_HOST?.trim() || null;
}
