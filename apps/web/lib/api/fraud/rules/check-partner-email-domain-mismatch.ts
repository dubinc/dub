import { PartnerProps } from "@/lib/types";

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

  const website = partner.platforms.find((p) => p.type === "website");

  if (!website || !website.identifier) {
    return false;
  }

  const emailParts = partner.email.split("@");
  if (emailParts.length !== 2 || !emailParts[0] || !emailParts[1]) {
    return false;
  }

  const emailDomain = normalizeDomain(emailParts[1]);
  let websiteDomain: string;

  try {
    const websiteUrl = new URL(website.identifier);
    websiteDomain = normalizeDomain(websiteUrl.hostname);
  } catch (error) {
    return false;
  }

  return emailDomain !== websiteDomain;
}
