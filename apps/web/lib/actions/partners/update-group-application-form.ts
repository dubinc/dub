"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { isStored, storage } from "@/lib/storage";
import { prisma } from "@dub/prisma";
import { nanoid, R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
import { ProgramWithLanderDataSchema } from "../../zod/schemas/programs";
import { authActionClient } from "../safe-action";
import { programApplicationFormSchema } from "@/lib/zod/schemas/program-application-form";

const schema = z.object({
  workspaceId: z.string(),
  groupId: z.string(),
  logo: z.string().nullish(),
  wordmark: z.string().nullish(),
  brandColor: z.string().nullish(),
  applicationFormData: programApplicationFormSchema,
});

export const updateGroupApplicationFormAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const {
      groupId,
      logo,
      wordmark,
      brandColor,
      applicationFormData: applicationFormDataInput,
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

    const updatedGroup = await prisma.partnerGroup.update({
      where: {
        id: groupId,
      },
      data: {
        applicationFormData: applicationFormDataInput,
        applicationFormPublishedAt: applicationFormDataInput ? new Date() : undefined,
      },
    });

    const updatedProgram = await prisma.program.update({
      where: {
        id: programId,
      },
      data: {
        logo: logoUrl ?? undefined,
        wordmark: wordmarkUrl ?? undefined,
        brandColor,
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
         - lander data
        */
        ...(
          // logoUrl ||
          // wordmarkUrl ||
          brandColor !== program.brandColor ||
            applicationFormDataInput
            ? [
              revalidatePath(`/partners.dub.co/${program.slug}`),
              revalidatePath(`/partners.dub.co/${program.slug}/apply`),
              revalidatePath(`/partners.dub.co/${program.slug}/apply/success`),
              revalidatePath(`/partners.dub.co/${program.slug}/${updatedGroup.slug}`),
              revalidatePath(`/partners.dub.co/${program.slug}/${updatedGroup.slug}/apply`),
              revalidatePath(`/partners.dub.co/${program.slug}/${updatedGroup.slug}/apply/success`),
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
      applicationFormData: programApplicationFormSchema.parse(updatedGroup.applicationFormData),
      program: ProgramWithLanderDataSchema.parse(updatedProgram),
    };
  });
