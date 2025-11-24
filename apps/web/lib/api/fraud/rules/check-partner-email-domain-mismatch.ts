import { EnrolledPartnerExtendedProps } from "@/lib/types";

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

  const emailDomain = emailParts[1].toLowerCase().trim();
  let websiteDomain: string;

  try {
    const websiteUrl = new URL(partner.website);
    websiteDomain = websiteUrl.hostname.toLowerCase().trim();
  } catch (error) {
    return false;
  }

  return emailDomain !== websiteDomain;
}
