import { qstash } from "@/lib/cron";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { PartnerGroup } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { triggerDraftBountySubmissionCreation } from "../bounties/trigger-draft-bounty-submissions";
import { includeProgramEnrollment } from "../links/include-program-enrollment";
import { includeTags } from "../links/include-tags";
import { notifyPartnerGroupChange } from "../partners/notify-partner-group-change";

interface MovePartnersToGroupParams {
  programId: string;
  partnerIds: string[];
  userId: string;
  group: Pick<
    PartnerGroup,
    | "id"
    | "name"
    | "clickRewardId"
    | "leadRewardId"
    | "saleRewardId"
    | "discountId"
  >;
}

export async function movePartnersToGroup({
  programId,
  partnerIds,
  userId,
  group,
}: MovePartnersToGroupParams): Promise<number> {
  if (partnerIds.length === 0) {
    return 0;
  }

  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      partnerId: {
        in: partnerIds,
      },
      programId,
    },
    select: {
      partnerId: true,
    },
  });

  if (programEnrollments.length === 0) {
    return 0;
  }

  partnerIds = programEnrollments.map(({ partnerId }) => partnerId);

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

        triggerDraftBountySubmissionCreation({
          programId,
          partnerIds,
        }),

        recordLink(partnerLinks),

        notifyPartnerGroupChange({
          programId,
          groupId: group.id,
          partnerIds,
        }),
      ]);
    })(),
  );

  return count;
}
