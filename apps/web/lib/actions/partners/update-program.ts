"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getFolderOrThrow } from "@/lib/folder/get-folder-or-throw";
import { isStored, storage } from "@/lib/storage";
import { prisma } from "@dub/prisma";
import { nanoid, R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
import { updateProgramSchema } from "../../zod/schemas/programs";
import { authActionClient } from "../safe-action";

const schema = updateProgramSchema.partial().extend({
  workspaceId: z.string(),
  logo: z.string().nullish(),
  wordmark: z.string().nullish(),
  brandColor: z.string().nullish(),
});

export const updateProgramAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const {
      defaultFolderId,
      name,
      holdingPeriodDays,
      minPayoutAmount,
      cookieLength,
      domain,
      url,
      logo,
      wordmark,
      brandColor,
      linkStructure,
      supportEmail,
      helpUrl,
      termsUrl,
    } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);
    const program = await getProgramOrThrow({
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

    const [logoUrl, wordmarkUrl] = await Promise.all([
      logo && !isStored(logo)
        ? storage
            .upload(`programs/${programId}/logo_${nanoid(7)}`, logo)
            .then(({ url }) => url)
        : null,
      wordmark && !isStored(wordmark)
        ? storage
            .upload(`programs/${programId}/wordmark_${nanoid(7)}`, wordmark)
            .then(({ url }) => url)
        : null,
    ]);

    await prisma.program.update({
      where: {
        id: programId,
      },
      data: {
        name,
        cookieLength,
        holdingPeriodDays,
        minPayoutAmount,
        domain,
        url,
        brandColor,
        logo: logoUrl ?? undefined,
        wordmark: wordmarkUrl ?? undefined,
        defaultFolderId,
        linkStructure,
        supportEmail,
        helpUrl,
        termsUrl,
      },
    });

    // Delete old logo/wordmark if they were updated
    waitUntil(
      Promise.all([
        ...(logoUrl && program.logo
          ? [storage.delete(program.logo.replace(`${R2_URL}/`, ""))]
          : []),
        ...(wordmarkUrl && program.wordmark
          ? [storage.delete(program.wordmark.replace(`${R2_URL}/`, ""))]
          : []),
      ]),
    );
  });
