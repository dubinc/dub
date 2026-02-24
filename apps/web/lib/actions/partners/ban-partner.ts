"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { DubApiError } from "@/lib/api/errors";
import { resolveFraudGroups } from "@/lib/api/fraud/resolve-fraud-groups";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { qstash } from "@/lib/cron";
import { UserProps, WorkspaceProps } from "@/lib/types";
import { banPartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import {
  PartnerBannedReason,
  ProgramEnrollmentStatus,
} from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

const queue = qstash.queue({
  queueName: "ban-partner",
});

// Ban a partner
export const banPartnerAction = authActionClient
  .inputSchema(banPartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerId, reason } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

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

  if (programEnrollment.status === "pending") {
    throw new DubApiError({
      code: "bad_request",
      message: "This partner is not approved yet to be banned.",
    });
  }

  if (programEnrollment.status === "banned") {
    throw new DubApiError({
      code: "bad_request",
      message: "This partner is already banned from your program.",
    });
  }

  const commonWhere = {
    partnerId,
    programId,
  };

  const programEnrollmentUpdated = await prisma.programEnrollment.update({
    where: {
      partnerId_programId: commonWhere,
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

  // Automatically resolve all pending fraud events for this partner in the current program
  await resolveFraudGroups({
    where: commonWhere,
    userId: user.id,
    resolutionReason: "Resolved automatically because the partner was banned.",
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
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/partners/ban`,
        deduplicationId: `ban-${programId}-${partnerId}`,
        method: "POST",
        body: {
          programId,
          partnerId,
        },
      }),
    ]),
  );

  return programEnrollmentUpdated;
};
