import "dotenv-flow/config";

import { prisma } from "@/lib/prisma";
import { EventType } from "@prisma/client";

const BATCH_SIZE = 100;

const EVENT_TO_PARTNER_GROUP = {
  [EventType.click]: "clickPartnerGroup",
  [EventType.lead]: "leadPartnerGroup",
  [EventType.sale]: "salePartnerGroup",
  [EventType.referral]: "referralPartnerGroup",
  [EventType.custom]: "customPartnerGroup",
} as const;

async function main() {
  let totalProcessed = 0;

  while (true) {
    const rewards = await prisma.reward.findMany({
      where: {
        groupId: null,
      },
      select: {
        id: true,
        event: true,
        clickPartnerGroup: {
          select: {
            id: true,
          },
        },
        leadPartnerGroup: {
          select: {
            id: true,
          },
        },
        salePartnerGroup: {
          select: {
            id: true,
          },
        },
        referralPartnerGroup: {
          select: {
            id: true,
          },
        },
        customPartnerGroup: {
          select: {
            id: true,
          },
        },
      },
      take: BATCH_SIZE,
      orderBy: {
        createdAt: "asc",
      },
    });

    if (rewards.length === 0) {
      break;
    }

    await Promise.all(
      rewards.map((reward) => {
        const groupRelation = EVENT_TO_PARTNER_GROUP[reward.event];
        const groupId = reward[groupRelation]?.id;

        if (!groupId) {
          console.log(`No group found for reward ${reward.id}`);
          return;
        }

        return prisma.reward.update({
          where: {
            id: reward.id,
          },
          data: {
            groupId,
          },
        });
      }),
    );

    totalProcessed += rewards.length;

    console.log(
      `Backfilled ${rewards.length} reward groupIds (processed=${totalProcessed})`,
    );
  }

  console.log(`Done backfilling reward groupIds (processed=${totalProcessed})`);
}

main();
