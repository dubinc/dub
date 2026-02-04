import { Session } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { ACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { recordAuditLog } from "../audit-logs/record-audit-log";

interface BulkDeactivatePartnersParams {
  workspaceId: string;
  programId: string;
  partnerIds: string[];
  user?: Session["user"];
  programDeactivated?: boolean; // Indicate if the entire program is being deactivated
}

// Bulk deactivate partners in a program
export async function bulkDeactivatePartners({
  workspaceId,
  programId,
  partnerIds,
  user,
  programDeactivated = false,
}: BulkDeactivatePartnersParams) {
  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      partnerId: {
        in: partnerIds,
      },
      programId,
      status: {
        in: ACTIVE_ENROLLMENT_STATUSES,
      },
    },
    select: {
      partner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (programEnrollments.length === 0) {
    console.log(
      "[bulkDeactivatePartners] No program enrollments found to deactivate.",
      {
        programId,
      },
    );
    return;
  }

  const partnerIdsToDeactivate = programEnrollments.map(
    ({ partner }) => partner.id,
  );

  await prisma.$transaction([
    prisma.link.updateMany({
      where: {
        programId,
        partnerId: {
          in: partnerIdsToDeactivate,
        },
      },
      data: {
        expiresAt: new Date(),
      },
    }),

    prisma.programEnrollment.updateMany({
      where: {
        partnerId: {
          in: partnerIdsToDeactivate,
        },
        programId,
        status: {
          in: ACTIVE_ENROLLMENT_STATUSES,
        },
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

  console.log("[bulkDeactivatePartners] Deactivated partners in program.", {
    programId,
    partnerIds: partnerIdsToDeactivate,
  });

  if (user) {
    waitUntil(
      recordAuditLog(
        programEnrollments.map(({ partner }) => ({
          workspaceId,
          programId,
          action: "partner.deactivated",
          description: `Partner ${partner.id} deactivated`,
          actor: user,
          targets: [
            {
              type: "partner",
              id: partner.id,
              metadata: {
                name: partner.name,
                email: partner.email ?? null,
              },
            },
          ],
        })),
      ),
    );
  }

  const qstashResponse = await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/partners/deactivate`,
    body: {
      programId,
      partnerIds: partnerIdsToDeactivate,
      programDeactivated,
    },
  });

  if (qstashResponse.messageId) {
    console.log(
      "[bulkDeactivatePartners] Deactivation job enqueued successfully.",
      {
        response: qstashResponse,
      },
    );
  } else {
    console.error(
      "[bulkDeactivatePartners] Failed to enqueue deactivation job",
      {
        response: qstashResponse,
      },
    );
  }
}
