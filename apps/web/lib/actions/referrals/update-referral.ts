"use server";

import { getResourceDiff } from "@/lib/api/activity-log/get-resource-diff";
import { trackActivityLog } from "@/lib/api/activity-log/track-activity-log";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getReferralOrThrow } from "@/lib/api/referrals/get-referral-or-throw";
import { updateReferralSchema } from "@/lib/zod/schemas/referrals";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

// Update a partner referral's details
export const updateReferralAction = authActionClient
  .inputSchema(updateReferralSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { referralId, name, email, company, formData } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const existingReferral = await getReferralOrThrow({
      referralId,
      programId,
    });

    const updatedReferral = await prisma.partnerReferral.update({
      where: {
        id: referralId,
      },
      data: {
        name,
        email,
        company,
        ...(formData && {
          formData: formData as Prisma.InputJsonValue,
        }),
      },
    });

    const diff = getResourceDiff(existingReferral, updatedReferral, {
      fields: ["name", "email", "company"],
    });

    if (diff) {
      waitUntil(
        trackActivityLog({
          workspaceId: workspace.id,
          programId,
          resourceType: "referral",
          resourceId: referralId,
          userId: user.id,
          action: "referral.updated",
          changeSet: diff,
        }),
      );
    }
  });
