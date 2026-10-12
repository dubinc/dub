import { getAll } from "@vercel/edge-config";

export const isBlacklistedDomain = async (
  domain: string,
): Promise<"whitelisted" | "blacklisted" | null> => {
  if (!process.env.EDGE_CONFIG || !domain) {
    return null;
  }

  try {
    const {
      domains: blacklistedDomains,
      terms: blacklistedTerms,
      whitelistedDomains,
    } = await getAll(["domains", "terms", "whitelistedDomains"]);

    if (whitelistedDomains.includes(domain)) {
      return "whitelisted";
    }

    const blacklistedTermsRegex = new RegExp(
      blacklistedTerms
        .map((term: string) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) // replace special characters with escape sequences
        .join("|"),
    );

    if (
      blacklistedDomains.includes(domain) ||
      blacklistedTermsRegex.test(domain)
    ) {
      return "blacklisted";
    }

    return null;
  } catch {
    return null;
  }
};
