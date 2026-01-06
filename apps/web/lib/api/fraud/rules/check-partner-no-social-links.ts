import { PartnerSocialPlatform } from "@/lib/types";

// Checks if the partner has neither a website nor any social media links
export function checkPartnerNoSocialLinks(platforms: PartnerSocialPlatform[]) {
  return !platforms.some(
    (p) => typeof p.handle === "string" && p.handle.trim().length > 0,
  );
}
