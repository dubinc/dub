import { PartnerProps } from "@/lib/types";

// Checks if the partner has neither a website nor any social media links
export function checkPartnerNoSocialLinks(
  partner: Pick<PartnerProps, "platforms">,
) {
  return !partner.platforms.some(
    (p) => typeof p.identifier === "string" && p.identifier.trim().length > 0,
  );
}
