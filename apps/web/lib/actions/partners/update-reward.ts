"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getRewardOrThrow } from "@/lib/api/partners/get-reward-or-throw";
import { serializeReward } from "@/lib/api/partners/serialize-reward";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { validateReward } from "@/lib/api/rewards/validate-reward";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { updateRewardSchema } from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
import { revalidatePath } from "next/cache";
import { authActionClient } from "../safe-action";

export const updateRewardAction = authActionClient
  .inputSchema(updateRewardSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const {
      type,
      amountInCents,
      amountInPercentage,
      maxDuration,
      description,
      tooltipDescription,
      modifiers,
      rewardId,
    } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const reward = await getRewardOrThrow({
      rewardId,
      programId,
    });

    const { canUseAdvancedRewardLogic } = getPlanCapabilities(workspace.plan);

    if (modifiers && !canUseAdvancedRewardLogic) {
      throw new Error(
        "Advanced reward structures are only available on the Advanced plan and above.",
      );
    }

    validateReward({
      ...parsedInput,
      event: reward.event,
    });

    const updatedReward = await prisma.reward.update({
      where: {
        id: rewardId,
      },
      data: {
        type,
        maxDuration,
        description: description || null,
        tooltipDescription: tooltipDescription || null,
        modifiers: modifiers === null ? Prisma.DbNull : modifiers,
        ...(type === "flat"
          ? {
              amountInCents,
              amountInPercentage: null,
            }
          : {
              amountInCents: null,
              amountInPercentage: new Prisma.Decimal(amountInPercentage!),
            }),
      },
      include: {
        program: true,
        clickPartnerGroup: true,
        leadPartnerGroup: true,
        salePartnerGroup: true,
      },
    });

    const {
      program,
      clickPartnerGroup,
      leadPartnerGroup,
      salePartnerGroup,
      ...rewardMetadata
    } = updatedReward;

    const isDefaultGroup = [
      clickPartnerGroup,
      leadPartnerGroup,
      salePartnerGroup,
    ].some((group) => group?.slug === "default");

    waitUntil(
      Promise.allSettled([
        recordAuditLog({
          workspaceId: workspace.id,
          programId,
          action: "reward.updated",
          description: `Reward ${rewardId} updated`,
          actor: user,
          targets: [
            {
              type: "reward",
              id: rewardId,
              metadata: serializeReward(rewardMetadata),
            },
          ],
        }),

        // we only cache default group pages for now so we need to invalidate them
        ...(isDefaultGroup
          ? [
              revalidatePath(`/partners.dub.co/${program.slug}`),
              revalidatePath(`/partners.dub.co/${program.slug}/apply`),
            ]
          : []),
      ]),
    );
  });
