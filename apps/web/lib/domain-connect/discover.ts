import dns from "node:dns/promises";
import type {
  DomainConnectDiscovery,
  DomainConnectProviderKind,
} from "./types";

export type { DomainConnectDiscovery, DomainConnectProviderKind };

type DomainConnectSettings = {
  providerId?: string;
  urlSyncUX?: string;
};

function providerKindFromId(
  id: string | undefined,
): DomainConnectProviderKind | null {
  if (!id) return null;
  const lower = id.toLowerCase();
  if (lower === "vercel.com") return "vercel";
  if (lower === "cloudflare.com" || lower.includes("cloudflare"))
    return "cloudflare";
  return null;
}

const ALLOWED_SETTINGS_HOST_SUFFIXES = [
  "domainconnect.org",
  ".vercel.com",
  ".cloudflare.com",
];

function settingsHostFromTxtRecords(records: string[][]): string | null {
  const candidates = records
    .map((chunks) =>
      chunks
        .join("")
        .replace(/^"(.*)"$/, "$1")
        .trim(),
    )
    .map((s) =>
      s
        .replace(/^https?:\/\//i, "")
        .split("/")[0]
        .toLowerCase(),
    )
    .filter(
      (h) =>
        h.includes(".") &&
        /^[a-z0-9.-]+$/.test(h) &&
        !/^\d+\.\d+\.\d+\.\d+$/.test(h),
    );

  return (
    candidates.find((h) =>
      ALLOWED_SETTINGS_HOST_SUFFIXES.some(
        (suffix) => h === suffix.replace(/^\./, "") || h.endsWith(suffix),
      ),
    ) ?? null
  );
}

/**
 * Discover Domain Connect provider for the given apex domain.
 * Returns null when the provider is not Vercel or Cloudflare, or on any error.
 */
export async function discoverDomainConnect(
  apexDomain: string,
): Promise<DomainConnectDiscovery | null> {
  let txtRecords: string[][];
  try {
    txtRecords = await dns.resolveTxt(
      `_domainconnect.${apexDomain.toLowerCase()}`,
    );
  } catch {
    return null;
  }

  const settingsHost = settingsHostFromTxtRecords(txtRecords);
  if (!settingsHost) return null;

  const settingsUrl = `https://${settingsHost}/v2/${encodeURIComponent(apexDomain.toLowerCase())}/settings`;
  let res: Response;
  try {
    res = await fetch(settingsUrl, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  let json: DomainConnectSettings;
  try {
    json = (await res.json()) as DomainConnectSettings;
  } catch {
    return null;
  }

  const urlSyncUX = json.urlSyncUX?.replace(/\/$/, "");
  const dnsProviderId = json.providerId ?? "";
  if (!urlSyncUX || !dnsProviderId) return null;

  const providerKind = providerKindFromId(dnsProviderId);
  if (!providerKind) return null;

  return { providerKind, dnsProviderId, urlSyncUX };
}

/**
 * Only discover when the feature is enabled and the status warrants it.
 */
export async function discoverDomainConnectIfEligible(
  apexDomain: string,
  status: string,
): Promise<DomainConnectDiscovery | null> {
  if (!process.env.DOMAIN_CONNECT_PRIVATE_KEY?.trim()) return null;
  if (status !== "Pending Verification" && status !== "Invalid Configuration")
    return null;
  return discoverDomainConnect(apexDomain);
}
