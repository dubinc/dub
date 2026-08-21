import { prisma } from "@/lib/prisma";
import {
  campaignEventSchema,
  getCampaignsEventsQuerySchema,
} from "@/lib/zod/schemas/campaigns";
import * as z from "zod/v4";

interface GetCampaignEventsParams
  extends z.infer<typeof getCampaignsEventsQuerySchema> {
  campaignId: string;
  programId: string;
}

export const getCampaignEvents = async ({
  campaignId,
  programId,
  status,
  page = 1,
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
            where: { programId },
            select: {
              partnerGroup: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
            take: 1,
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
