import { getCampaignsEventsQuerySchema } from "@/lib/zod/schemas/campaigns";
import { GroupSchema } from "@/lib/zod/schemas/groups";
import { EnrolledPartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { z } from "zod";

interface GetCampaignEventsParams
  extends z.infer<typeof getCampaignsEventsQuerySchema> {
  campaignId: string;
}

const campaignEventSchema = z.object({
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
  createdAt: z.date(),
  openedAt: z.date().nullable(),
  bouncedAt: z.date().nullable(),
  deliveredAt: z.date().nullable(),
});

export const getCampaignEvents = async (params: GetCampaignEventsParams) => {
  const { campaignId, status, page, pageSize } = params;

  const results = await prisma.notificationEmail.findMany({
    where: {
      campaignId,
      ...(status === "opened" && { openedAt: { not: null } }),
      ...(status === "bounced" && { bouncedAt: { not: null } }),
    },
    select: {
      createdAt: true,
      openedAt: true,
      bouncedAt: true,
      deliveredAt: true,
      partner: {
        select: {
          id: true,
          name: true,
          image: true,
          programs: {
            select: {
              partnerGroup: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
        },
      },
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const events = results.map((result) => {
    return {
      partner: result.partner,
      group: result.partner?.programs[0]?.partnerGroup,
      createdAt: result.createdAt,
      openedAt: result.openedAt,
      bouncedAt: result.bouncedAt,
      deliveredAt: result.deliveredAt,
    };
  });

  return z.array(campaignEventSchema).parse(events);
};
