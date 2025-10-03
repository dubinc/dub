import { getCampaignsEventsQuerySchema } from "@/lib/zod/schemas/campaigns";
import { GroupSchema } from "@/lib/zod/schemas/groups";
import { EnrolledPartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { z } from "zod";

interface GetCampaignEventsParams
  extends z.infer<typeof getCampaignsEventsQuerySchema> {
  campaignId: string;
}

const schema = z.object({
  partner: EnrolledPartnerSchema.pick({
    id: true,
    name: true,
    image: true,
  }),
  group: GroupSchema.pick({
    id: true,
    name: true,
    color: true,
  }),
  date: z.date(),
});

export const getCampaignEvents = async (params: GetCampaignEventsParams) => {
  const { campaignId, status, page, pageSize } = params;

  const results = await prisma.notificationEmail.findMany({
    where: {
      campaignId,
      ...(status === "opened" && { openedAt: { not: null } }),
      ...(status === "bounced" && { bouncedAt: { not: null } }),
    },
    include: {
      partner: {
        include: {
          programs: {
            include: {
              partnerGroup: true
            }
          }
        }
      }
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  console.log(results)

  return results;

  // return schema.parse(results);
};
