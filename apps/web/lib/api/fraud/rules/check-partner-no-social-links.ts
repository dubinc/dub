import { PartnerProps } from "@/lib/types";

// Checks if the partner has neither a website nor any social media links
export function checkPartnerNoSocialLinks(
  partner: Pick<PartnerProps, "platforms">,
) {
  return !partner.platforms.some(
    (p) => typeof p.handle === "string" && p.handle.trim().length > 0,
  );
}
