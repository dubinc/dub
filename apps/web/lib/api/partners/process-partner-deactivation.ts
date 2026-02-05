import { Session } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { prisma } from "@dub/prisma";
import { Partner } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { recordAuditLog } from "../audit-logs/record-audit-log";

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
