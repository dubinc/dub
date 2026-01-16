import { PartnerProps } from "@/lib/types";

// Checks if the partner has no verified website or social media links
export function checkPartnerNoVerifiedSocialLinks(
  partner: Pick<PartnerProps, "platforms">,
) {
  return !partner.platforms.some((p) => p.verifiedAt != null);
}
