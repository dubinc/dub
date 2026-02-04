import { Session } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { ACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { recordAuditLog } from "../audit-logs/record-audit-log";
import { DubApiError } from "../errors";
import { getProgramEnrollmentOrThrow } from "../programs/get-program-enrollment-or-throw";

interface DeactivatePartnerParams {
  workspaceId: string;
  programId: string;
  partnerId: string;
  user?: Session["user"];
}

// Deactivate a partner in a program
export async function deactivatePartner({
  workspaceId,
  programId,
  partnerId,
  user,
}: DeactivatePartnerParams) {
  const programEnrollment = await getProgramEnrollmentOrThrow({
    programId,
    partnerId,
    include: {
      partner: true,
    },
  });

  if (
    !ACTIVE_ENROLLMENT_STATUSES.includes(
      programEnrollment.status as (typeof ACTIVE_ENROLLMENT_STATUSES)[number],
    )
  ) {
    throw new DubApiError({
      code: "bad_request",
      message: `Only partners with an "approved" or "archived" status can be deactivated. The partner's status in this program is "${programEnrollment.status}".`,
    });
  }

  const { partner } = programEnrollment;

  await prisma.$transaction([
    prisma.link.updateMany({
      where: {
        programId,
        partnerId: partner.id,
      },
      data: {
        expiresAt: new Date(),
      },
    }),

    prisma.programEnrollment.update({
      where: {
        partnerId_programId: {
          partnerId: partner.id,
          programId,
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

  console.log("[deactivatePartner] Deactivated partner in program.", {
    programId,
    partnerId: partner.id,
  });

  if (user) {
    waitUntil(
      recordAuditLog({
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
      }),
    );
  }

  const qstashResponse = await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/partners/deactivate`,
    body: {
      programId,
      partnerIds: [partner.id],
    },
  });

  if (qstashResponse.messageId) {
    console.log("[deactivatePartner] Deactivation job enqueued successfully.", {
      response: qstashResponse,
    });
  } else {
    console.error("[deactivatePartner] Failed to enqueue deactivation job", {
      response: qstashResponse,
    });
  }
}
