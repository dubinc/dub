import { getAll } from "@vercel/edge-config";

export type BlacklistedDomainStatus = "whitelisted" | "blacklisted" | null;

// Terms stored from "Ban apex domain" look like ".evil.com" so they match
// subdomains without also matching lookalikes such as "notevil.com".
// The apex hostname "evil.com" does not contain that leading dot, so a
// substring test on the hostname alone lets the banned apex through.
export function matchesBlacklistedTerm(term: string, domain: string) {
  if (!term || !domain) return false;

  if (term.startsWith(".")) {
    const apex = term.slice(1);
    return domain === apex || domain.endsWith(term);
  }

  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped).test(domain);
}

export function getBlacklistedDomainStatus({
  domain,
  blacklistedDomains,
  blacklistedTerms,
  whitelistedDomains,
}: {
  domain: string;
  blacklistedDomains?: string[] | null;
  blacklistedTerms?: string[] | null;
  whitelistedDomains?: string[] | null;
}): BlacklistedDomainStatus {
  if (!domain) return null;

  if (whitelistedDomains?.includes(domain)) {
    return "whitelisted";
  }

  if (blacklistedDomains?.includes(domain)) {
    return "blacklisted";
  }

  if (blacklistedTerms?.some((term) => matchesBlacklistedTerm(term, domain))) {
    return "blacklisted";
  }

  return null;
}

export const isBlacklistedDomain = async (
  domain: string,
): Promise<BlacklistedDomainStatus> => {
  if (!process.env.EDGE_CONFIG || !domain) {
    return null;
  }

  try {
    const {
      domains: blacklistedDomains,
      terms: blacklistedTerms,
      whitelistedDomains,
    } = await getAll(["domains", "terms", "whitelistedDomains"]);

    return getBlacklistedDomainStatus({
      domain,
      blacklistedDomains,
      blacklistedTerms,
      whitelistedDomains,
    });
  } catch {
    return null;
  }
};
