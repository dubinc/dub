import { EnrolledPartnerExtendedProps } from "@/lib/types";

function normalizeDomain(domain: string) {
  return domain
    .toLowerCase()
    .replace(/^www\./, "")
    .trim();
}

// Checks if the partner's email domain doesn't match their website domain
export function checkPartnerEmailDomainMismatch(
  partner: Pick<EnrolledPartnerExtendedProps, "email" | "website">,
) {
  if (!partner.email || !partner.website) {
    return false;
  }

  const emailParts = partner.email.split("@");
  if (emailParts.length !== 2 || !emailParts[0] || !emailParts[1]) {
    return false;
  }

  const emailDomain = normalizeDomain(emailParts[1]);
  let websiteDomain: string;

  try {
    const websiteUrl = new URL(partner.website);
    websiteDomain = normalizeDomain(websiteUrl.hostname);
  } catch (error) {
    return false;
  }

  return emailDomain !== websiteDomain;
}
