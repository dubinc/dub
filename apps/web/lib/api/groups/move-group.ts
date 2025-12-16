import { qstash } from "@/lib/cron";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { PartnerGroup } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, prettyPrint } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { triggerDraftBountySubmissionCreation } from "../bounties/trigger-draft-bounty-submissions";
import { includeProgramEnrollment } from "../links/include-program-enrollment";
import { includeTags } from "../links/include-tags";

interface MoveGroupParams {
  programId: string;
  partnerIds: string[];
  userId: string;
  group: Pick<
    PartnerGroup,
    "id" | "clickRewardId" | "leadRewardId" | "saleRewardId" | "discountId"
  >;
}

export async function moveGroup({
  programId,
  partnerIds,
  userId,
  group,
}: MoveGroupParams): Promise<number> {
  if (partnerIds.length === 0) {
    return 0;
  }

  const { count } = await prisma.programEnrollment.updateMany({
    where: {
      partnerId: {
        in: partnerIds,
      },
      programId,
    },
    data: {
      groupId: group.id,
      clickRewardId: group.clickRewardId,
      leadRewardId: group.leadRewardId,
      saleRewardId: group.saleRewardId,
      discountId: group.discountId,
    },
  });

  if (count === 0) {
    return 0;
  }

  console.log(
    `Moved ${count} partners to group ${group.id}`,
    prettyPrint({ partnerIds }),
  );

  waitUntil(
    (async () => {
      const partnerLinks = await prisma.link.findMany({
        where: {
          programId,
          partnerId: {
            in: partnerIds,
          },
        },
        include: {
          ...includeTags,
          ...includeProgramEnrollment,
        },
      });

      await Promise.allSettled([
        qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/groups/remap-default-links`,
          body: {
            programId,
            groupId: group.id,
            partnerIds,
            userId,
          },
        }),

        qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/groups/remap-discount-codes`,
          body: {
            programId,
            partnerIds,
            groupId: group.id,
          },
        }),

        triggerDraftBountySubmissionCreation({
          programId,
          partnerIds,
        }),

        recordLink(partnerLinks),
      ]);
    })(),
  );

  return count;
}
