import { PartnerProps } from "@/lib/types";
import { extractEmailDomain } from "../utils";

// Checks if the partner is using an Apple private relay email address
export function checkPartnerEmailMasked(partner: Pick<PartnerProps, "email">) {
  if (!partner.email) {
    return false;
  }

  const domain = extractEmailDomain(partner.email);
  if (!domain) {
    return false;
  }

  return domain === "privaterelay.appleid.com";
}
