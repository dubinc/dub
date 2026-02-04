import { Session } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { ACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { recordAuditLog } from "../audit-logs/record-audit-log";

type PartnerInfo = {
  id: string;
  name: string;
  email: string | null;
};

interface ExecutePartnerDeactivationParams {
  workspaceId: string;
  programId: string;
  partners: PartnerInfo[];
  user?: Session["user"];
  programDeactivated?: boolean;
}

// Core function that executes the deactivation logic
// Called by both deactivatePartner and bulkDeactivatePartners
export async function executePartnerDeactivation({
  workspaceId,
  programId,
  partners,
  user,
  programDeactivated = false,
}: ExecutePartnerDeactivationParams) {
  if (partners.length === 0) {
    return;
  }

  const partnerIds = partners.map((p) => p.id);

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

  console.log("[executePartnerDeactivation] Deactivated partners in program.", {
    programId,
    partnerIds,
  });

  if (user) {
    waitUntil(
      recordAuditLog(
        partners.map((partner) => ({
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
                email: partner.email,
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
      partnerIds,
      programDeactivated,
    },
  });

  if (qstashResponse.messageId) {
    console.log(
      "[executePartnerDeactivation] Deactivation job enqueued successfully.",
      {
        response: qstashResponse,
      },
    );
  } else {
    console.error(
      "[executePartnerDeactivation] Failed to enqueue deactivation job",
      {
        response: qstashResponse,
      },
    );
  }
}

interface BulkDeactivatePartnersParams {
  workspaceId: string;
  programId: string;
  partnerIds: string[];
  user?: Session["user"];
  programDeactivated?: boolean; // Indicate if the entire program is being deactivated
}

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

  const partners = programEnrollments.map(({ partner }) => partner);

  await executePartnerDeactivation({
    workspaceId,
    programId,
    partners,
    user,
    programDeactivated,
  });
}
