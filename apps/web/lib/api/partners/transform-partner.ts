import {
  EnrolledPartnerSchema,
  EnrolledPartnerSchemaWithExpandedFields,
} from "@/lib/zod/schemas/partners";
import { getPrettyUrl } from "@dub/utils";
import { z } from "zod";

export const transformPartner = (
  partner:
    | z.infer<typeof EnrolledPartnerSchema>
    | z.infer<typeof EnrolledPartnerSchemaWithExpandedFields>,
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
