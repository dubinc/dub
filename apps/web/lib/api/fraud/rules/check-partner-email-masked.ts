import { EnrolledPartnerExtendedProps } from "@/lib/types";

// Checks if the partner is using an Apple private relay email address
export function checkPartnerEmailMasked(
  partner: Pick<EnrolledPartnerExtendedProps, "email">,
) {
  if (!partner.email) {
    return false;
  }

  const emailParts = partner.email.split("@");
  if (emailParts.length !== 2) {
    return false;
  }

  const domain = emailParts[1].toLowerCase().trim();

  return domain === "privaterelay.appleid.com";
}
