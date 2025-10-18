import {
  campaignEventSchema,
  getCampaignsEventsQuerySchema,
} from "@/lib/zod/schemas/campaigns";
import { prisma } from "@dub/prisma";
import { z } from "zod";

interface GetCampaignEventsParams
  extends z.infer<typeof getCampaignsEventsQuerySchema> {
  campaignId: string;
}

export const getCampaignEvents = async ({
  campaignId,
  status,
  page,
  pageSize,
  search,
}: GetCampaignEventsParams) => {
  const results = await prisma.notificationEmail.findMany({
    where: {
      campaignId,
      ...(status === "delivered" && { deliveredAt: { not: null } }),
      ...(status === "opened" && { openedAt: { not: null } }),
      ...(status === "bounced" && { bouncedAt: { not: null } }),
      ...(search && {
        OR: [
          { partner: { email: { contains: search } } },
          { partner: { name: { contains: search } } },
        ],
      }),
    },
    include: {
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
    orderBy: {
      ...(status === "delivered" && { deliveredAt: "desc" }),
      ...(status === "opened" && { openedAt: "desc" }),
      ...(status === "bounced" && { bouncedAt: "desc" }),
    },
  });

  const events = results.map((result) => {
    return {
      id: result.id,
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
