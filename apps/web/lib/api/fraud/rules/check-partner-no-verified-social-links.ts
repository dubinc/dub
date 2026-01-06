import { PartnerSocialPlatform } from "@/lib/types";

// Checks if the partner has no verified website or social media links
export function checkPartnerNoVerifiedSocialLinks(
  platforms: PartnerSocialPlatform[],
) {
  return !platforms.some((p) => p.verifiedAt != null);
}
