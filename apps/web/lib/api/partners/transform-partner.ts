import {
  EnrolledPartnerSchema,
  EnrolledPartnerSchemaExtended,
} from "@/lib/zod/schemas/partners";
import { getPrettyUrl } from "@dub/utils";
import { z } from "zod";

// TODO: This is nice to have but ideally response types should be the same
// across all partners endpoints, so we're not using this for now.
export const transformPartner = (
  partner:
    | z.infer<typeof EnrolledPartnerSchema>
    | z.infer<typeof EnrolledPartnerSchemaExtended>,
) => {
  return {
    ...partner,
    website: partner.website ? getPrettyUrl(partner.website) : null,
    youtube: partner.youtube
      ? `https://www.youtube.com/@${partner.youtube}`
      : null,
    twitter: partner.twitter ? `https://x.com/${partner.twitter}` : null,
    linkedin: partner.linkedin
      ? `https://www.linkedin.com/in/${partner.linkedin}`
      : null,
    instagram: partner.instagram
      ? `https://www.instagram.com/${partner.instagram}`
      : null,
    tiktok: partner.tiktok ? `https://www.tiktok.com/@${partner.tiktok}` : null,
  };
};
