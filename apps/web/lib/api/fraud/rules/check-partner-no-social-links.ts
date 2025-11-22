import { EnrolledPartnerExtendedProps } from "@/lib/types";

// Checks if the partner has neither a website nor any social media links
export function checkPartnerNoSocialLinks(
  partner: Pick<
    EnrolledPartnerExtendedProps,
    "website" | "youtube" | "twitter" | "linkedin" | "instagram" | "tiktok"
  >,
) {
  const hasWebsite = partner.website && partner.website.trim().length > 0;

  const hasSocialLinks =
    (partner.youtube && partner.youtube.trim().length > 0) ||
    (partner.twitter && partner.twitter.trim().length > 0) ||
    (partner.linkedin && partner.linkedin.trim().length > 0) ||
    (partner.instagram && partner.instagram.trim().length > 0) ||
    (partner.tiktok && partner.tiktok.trim().length > 0);

  return !hasWebsite && !hasSocialLinks;
}
