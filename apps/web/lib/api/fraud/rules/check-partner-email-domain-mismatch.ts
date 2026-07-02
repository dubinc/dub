import { PartnerProps } from "@/lib/types";
import { getDomainWithoutWWW } from "@dub/utils";
import { PlatformType } from "@prisma/client";

function normalizeDomain(domain: string) {
  return domain
    .toLowerCase()
    .replace(/^www\./, "")
    .trim();
}

// Checks if the partner's email domain doesn't match their website domain
export function checkPartnerEmailDomainMismatch(
  partner: Pick<PartnerProps, "email" | "platforms">,
) {
  if (!partner.email || partner.platforms.length === 0) {
    return false;
  }

  const websites = partner.platforms.filter(
    (p) => p.type === PlatformType.website && p.identifier,
  );

  if (websites.length === 0) {
    return false;
  }

  const emailParts = partner.email.split("@");
  if (emailParts.length !== 2 || !emailParts[0] || !emailParts[1]) {
    return false;
  }

  const emailDomain = normalizeDomain(emailParts[1]);

  const websiteDomains = websites
    .map((website) => getDomainWithoutWWW(website.identifier)?.toLowerCase())
    .filter((domain): domain is string => Boolean(domain));

  if (websiteDomains.length === 0) {
    return false;
  }

  return !websiteDomains.some((domain) => domain === emailDomain);
}
