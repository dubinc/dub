import { EnrolledPartnerExtendedProps } from "@/lib/types";

// Checks if the partner has no verified website or social media links
export function checkPartnerNoVerifiedSocialLinks(
  partner: Pick<
    EnrolledPartnerExtendedProps,
    | "websiteVerifiedAt"
    | "youtubeVerifiedAt"
    | "twitterVerifiedAt"
    | "linkedinVerifiedAt"
    | "instagramVerifiedAt"
    | "tiktokVerifiedAt"
  >,
) {
  const hasVerifiedWebsite = partner.websiteVerifiedAt != null;

  const hasVerifiedSocialLinks =
    partner.youtubeVerifiedAt != null ||
    partner.twitterVerifiedAt != null ||
    partner.linkedinVerifiedAt != null ||
    partner.instagramVerifiedAt != null ||
    partner.tiktokVerifiedAt != null;

  return !hasVerifiedWebsite && !hasVerifiedSocialLinks;
}
