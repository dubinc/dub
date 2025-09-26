import { z } from "zod";
import { getPaginationQuerySchema } from "./misc";
import { PartnerSchema } from "./partners";

export const DISCOVERABLE_PARTNERS_MAX_PAGE_SIZE = 50;

export const getDiscoverablePartnersQuerySchema = z
  .object({
    //
  })
  .merge(
    getPaginationQuerySchema({ pageSize: DISCOVERABLE_PARTNERS_MAX_PAGE_SIZE }),
  );

export const DiscoverablePartnerSchema = PartnerSchema.pick({
  id: true,
  name: true,
  companyName: true,
  country: true,
  profileType: true,
  image: true,
  description: true,
  discoverableAt: true,

  monthlyTraffic: true,
  industryInterests: true,
  preferredEarningStructures: true,
  salesChannels: true,

  website: true,
  websiteVerifiedAt: true,
  youtube: true,
  youtubeVerifiedAt: true,
  youtubeSubscriberCount: true,
  youtubeViewCount: true,
  twitter: true,
  twitterVerifiedAt: true,
  linkedin: true,
  linkedinVerifiedAt: true,
  instagram: true,
  instagramVerifiedAt: true,
  tiktok: true,
  tiktokVerifiedAt: true,
}).merge(
  z.object({
    lastConversionAt: z.date().nullable(),
  }),
);
