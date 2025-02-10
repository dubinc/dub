"use server";

import { getFolderOrThrow } from "@/lib/folder/get-folder-or-throw";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
import { createProgramSchema } from "../../zod/schemas/programs";
import { authActionClient } from "../safe-action";

const schema = createProgramSchema.partial().extend({
  workspaceId: z.string(),
  programId: z.string(),
});

export const updateProgramAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const {
      programId,
      defaultFolderId,
      name,
      commissionType,
      commissionAmount,
      commissionDuration,
      commissionInterval,
      cookieLength,
      domain,
      url,
    } = parsedInput;

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    if (defaultFolderId) {
      await getFolderOrThrow({
        workspaceId: workspace.id,
        userId: ctx.user.id,
        folderId: defaultFolderId,
      });
    }

    await prisma.program.update({
      where: {
        id: programId,
      },
      data: {
        name,
        commissionType,
        commissionAmount,
        commissionDuration,
        commissionInterval,
        cookieLength,
        domain,
        url,
        defaultFolderId,
      },
    });
  });
