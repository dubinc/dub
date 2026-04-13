import { Session } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { prisma } from "@dub/prisma";
import { Partner, ProgramEnrollmentStatus } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { trackActivityLog } from "../activity-log/track-activity-log";

interface ProcessPartnerDeactivationParams {
  workspaceId: string;
  programId: string;
  partners: Pick<Partner, "id" | "name" | "email">[];
  user?: Session["user"];
  programDeactivated?: boolean;
}

// Core function that executes the deactivation logic
// Called by both deactivatePartner and bulkDeactivatePartners
export async function processPartnerDeactivation({
  workspaceId,
  programId,
  partners,
  user,
  programDeactivated = false,
}: ProcessPartnerDeactivationParams) {
  if (partners.length === 0) {
    return;
  }

  const partnerIds = partners.map((p) => p.id);

  // Capture old statuses for activity logging
  const oldEnrollments = await prisma.programEnrollment.findMany({
    where: {
      programId,
      partnerId: {
        in: partnerIds,
      },
    },
    select: {
      partnerId: true,
      status: true,
    },
  });

  const oldStatusByPartnerId = new Map<string, ProgramEnrollmentStatus>(
    oldEnrollments.map((e) => [e.partnerId, e.status]),
  );

  await prisma.$transaction([
    prisma.link.updateMany({
      where: {
        programId,
        partnerId: {
          in: partnerIds,
        },
      },
      data: {
        expiresAt: new Date(),
      },
    }),

    prisma.programEnrollment.updateMany({
      where: {
        partnerId: {
          in: partnerIds,
        },
        programId,
      },
      data: {
        status: "deactivated",
        clickRewardId: null,
        leadRewardId: null,
        saleRewardId: null,
        discountId: null,
      },
    }),
  ]);

  console.log("[processPartnerDeactivation] Deactivated partners in program.", {
    programId,
    partnerIds,
  });

  if (user) {
    waitUntil(
      trackActivityLog(
        partners.map((partner) => ({
          workspaceId,
          programId,
          resourceType: "partner",
          resourceId: partner.id,
          userId: user.id,
          action: "partner.deactivated",
          changeSet: {
            status: {
              old: oldStatusByPartnerId.get(partner.id),
              new: "deactivated",
            },
          },
        })),
      ),
    );
  }

  const qstashResponse = await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/partners/deactivate`,
    body: {
      programId,
      partnerIds,
      programDeactivated,
    },
  });

  if (qstashResponse.messageId) {
    console.log(
      "[processPartnerDeactivation] Deactivation job enqueued successfully.",
      {
        response: qstashResponse,
      },
    );
  } else {
    console.error(
      "[processPartnerDeactivation] Failed to enqueue deactivation job",
      {
        response: qstashResponse,
      },
    );
  }
}
