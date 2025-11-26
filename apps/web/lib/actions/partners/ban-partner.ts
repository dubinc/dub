"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { qstash } from "@/lib/cron";
import { UserProps, WorkspaceProps } from "@/lib/types";
import { banPartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { PartnerBannedReason, ProgramEnrollmentStatus } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

const queue = qstash.queue({
  queueName: "ban-partner",
});

// Ban a partner
export const banPartnerAction = authActionClient
  .schema(banPartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerId, reason } = parsedInput;

    await banPartner({
      workspace,
      partnerId,
      reason,
      user,
    });
  });

export const banPartner = async ({
  workspace,
  partnerId,
  reason,
  user,
}: {
  workspace: Pick<WorkspaceProps, "id" | "defaultProgramId">;
  partnerId: string;
  reason: PartnerBannedReason;
  user: Pick<UserProps, "id">;
}) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const programEnrollment = await getProgramEnrollmentOrThrow({
    partnerId,
    programId,
    include: {
      partner: true,
    },
  });

  if (programEnrollment.status === "banned") {
    throw new DubApiError({
      code: "bad_request",
      message: "This partner is already banned from your program.",
    });
  }

  const programEnrollmentUpdated = await prisma.programEnrollment.update({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
      },
    },
    data: {
      status: ProgramEnrollmentStatus.banned,
      bannedAt: new Date(),
      bannedReason: reason,
      clickRewardId: null,
      leadRewardId: null,
      saleRewardId: null,
      discountId: null,
    },
  });

  waitUntil(
    Promise.allSettled([
      recordAuditLog({
        workspaceId: workspace.id,
        programId,
        action: "partner.banned",
        description: `Partner ${partnerId} banned`,
        actor: user,
        targets: [
          {
            type: "partner",
            id: partnerId,
            metadata: programEnrollment.partner,
          },
        ],
      }),

      queue.enqueueJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/partners/ban/process`,
        deduplicationId: `ban-${programId}-${partnerId}`,
        method: "POST",
        body: {
          programId,
          partnerId,
          userId: user.id,
        },
      }),
    ]),
  );

  return programEnrollmentUpdated;
};
