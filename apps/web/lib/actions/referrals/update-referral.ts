"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getReferralOrThrow } from "@/lib/api/referrals/get-referral-or-throw";
import { updateReferralSchema } from "@/lib/zod/schemas/referrals";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

// Update a partner referral's details
export const updateReferralAction = authActionClient
  .inputSchema(updateReferralSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { referralId, name, email, company, formData } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    await getReferralOrThrow({
      referralId,
      programId,
    });

    await prisma.partnerReferral.update({
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
  });
