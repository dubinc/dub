"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getFolderOrThrow } from "@/lib/folder/get-folder-or-throw";
import { isStored, storage } from "@/lib/storage";
import { prisma } from "@dub/prisma";
import { nanoid, R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
import { createProgramSchema } from "../../zod/schemas/programs";
import { authActionClient } from "../safe-action";

const schema = createProgramSchema.partial().extend({
  workspaceId: z.string(),
  programId: z.string(),
  logo: z.string().nullish(),
  wordmark: z.string().nullish(),
  brandColor: z.string().nullish(),
});

export const updateProgramAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const {
      programId,
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
    } = parsedInput;

    try {
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

      const updatedProgram = await prisma.program.update({
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

          recordAuditLog({
            workspaceId: workspace.id,
            programId: program.id,
            event: "program.update",
            actor: user,
            targets: [
              {
                type: "program",
                id: program.id,
                metadata: updatedProgram,
              },
            ],
          }),
        ]),
      );

      return { ok: true, program };
    } catch (e) {
      console.error("Failed to update program", e);
      return { ok: false };
    }
  });
