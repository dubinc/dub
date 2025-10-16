"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { isStored, storage } from "@/lib/storage";
import { programLanderSchema } from "@/lib/zod/schemas/program-lander";
import { prisma } from "@dub/prisma";
import { nanoid, R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
import { ProgramSchema, updateProgramSchema } from "../../zod/schemas/programs";
import { authActionClient } from "../safe-action";

const schema = updateProgramSchema.partial().extend({
  workspaceId: z.string(),
  logo: z.string().nullish(),
  wordmark: z.string().nullish(),
  brandColor: z.string().nullish(),
  landerData: programLanderSchema.nullish(),
});

export const updateProgramAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const {
      name,
      logo,
      wordmark,
      brandColor,
      landerData: landerDataInput,
      domain,
      url,
      supportEmail,
      helpUrl,
      termsUrl,
      holdingPeriodDays,
      minPayoutAmount,
      messagingEnabledAt,
    } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);
    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

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
        logo: logoUrl ?? undefined,
        wordmark: wordmarkUrl ?? undefined,
        brandColor,
        domain,
        url,
        supportEmail,
        helpUrl,
        termsUrl,
        holdingPeriodDays,
        minPayoutAmount,
        ...(messagingEnabledAt !== undefined &&
          (getPlanCapabilities(workspace.plan).canMessagePartners ||
            messagingEnabledAt === null) && { messagingEnabledAt }),
      },
    });

    waitUntil(
      Promise.allSettled([
        // Delete old logo/wordmark if they were updated
        ...(logoUrl && program.logo
          ? [storage.delete(program.logo.replace(`${R2_URL}/`, ""))]
          : []),
        ...(wordmarkUrl && program.wordmark
          ? [storage.delete(program.wordmark.replace(`${R2_URL}/`, ""))]
          : []),

        /*
         Revalidate public pages if the following fields were updated:
         - name
         - logo
         - wordmark
         - brand color
        */
        ...(name !== program.name ||
        logoUrl ||
        wordmarkUrl ||
        brandColor !== program.brandColor
          ? [
              revalidatePath(`/partners.dub.co/${program.slug}`),
              revalidatePath(`/partners.dub.co/${program.slug}/apply`),
              revalidatePath(`/partners.dub.co/${program.slug}/apply/success`),
            ]
          : []),

        recordAuditLog({
          workspaceId: workspace.id,
          programId: program.id,
          action: "program.updated",
          description: `Program ${program.name} updated`,
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

    return {
      success: true,
      program: ProgramSchema.parse(updatedProgram),
    };
  });
