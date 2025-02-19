"use server";

import { DubApiError } from "@/lib/api/errors";
import { getRewardOrThrow } from "@/lib/api/partners/get-reward-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  rewardId: z.string(),
});

export const deleteRewardAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { programId, rewardId } = parsedInput;

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    await getRewardOrThrow({
      rewardId,
      programId,
    });

    if (program.defaultRewardId === rewardId) {
      throw new DubApiError({
        code: "bad_request",
        message: "This is a default reward and cannot be deleted.",
      });
    }

    await prisma.reward.delete({
      where: {
        id: rewardId,
      },
    });
  });
