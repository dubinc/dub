"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { isStored, storage } from "@/lib/storage";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { programApplicationFormSchema } from "@/lib/zod/schemas/program-application-form";
import { programLanderSchema } from "@/lib/zod/schemas/program-lander";
import { prisma } from "@dub/prisma";
import { nanoid, R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ProgramWithLanderDataSchema } from "../../zod/schemas/programs";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  groupId: z.string(),
  logo: z.string().nullish(),
  wordmark: z.string().nullish(),
  brandColor: z.string().nullish(),
  applicationFormData: programApplicationFormSchema.nullish(),
  landerData: programLanderSchema.nullish(),
});

export const updateGroupBrandingAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const {
      groupId,
      logo,
      wordmark,
      brandColor,
      applicationFormData: applicationFormDataInput,
      landerData: landerDataInput,
    } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);
    const group = await getGroupOrThrow({
      programId,
      groupId,
      includeExpandedFields: true,
    });

    const { program } = group;

    const logoUpdated = logo && !isStored(logo);
    const wordmarkUpdated = wordmark && !isStored(wordmark);
    const brandColorUpdated = brandColor !== program.brandColor;

    const [logoUrl, wordmarkUrl] = await Promise.all([
      logoUpdated
        ? storage
            .upload(`programs/${programId}/logo_${nanoid(7)}`, logo)
            .then(({ url }) => url)
        : null,
      wordmarkUpdated
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
        applicationFormData: applicationFormDataInput
          ? applicationFormDataInput
          : undefined,
        applicationFormPublishedAt: applicationFormDataInput
          ? new Date()
          : undefined,
        landerData: landerDataInput ? landerDataInput : undefined,
        landerPublishedAt: landerDataInput ? new Date() : undefined,
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
      (async () => {
        const res = await Promise.allSettled([
          // Delete old logo/wordmark if they were updated
          ...(logoUpdated && program.logo && isStored(program.logo)
            ? [storage.delete(program.logo.replace(`${R2_URL}/`, ""))]
            : []),
          ...(wordmarkUpdated && program.wordmark && isStored(program.wordmark)
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
          ...(logoUpdated ||
          wordmarkUpdated ||
          brandColorUpdated ||
          landerDataInput ||
          applicationFormDataInput
            ? [
                revalidatePath(`/partners.dub.co/${program.slug}`),
                revalidatePath(`/partners.dub.co/${program.slug}/apply`),
                revalidatePath(
                  `/partners.dub.co/${program.slug}/apply/success`,
                ),
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
        ]);

        console.log(
          `Completed waitUntil steps for group branding update: ${JSON.stringify(res, null, 2)}`,
        );

        if (updatedGroup.slug === DEFAULT_PARTNER_GROUP.slug) {
          if (landerDataInput) {
            console.log(
              "Default lander data updated, updating other groups (that don't have a custom data)...",
            );
            const updatedGroups = await prisma.partnerGroup.updateMany({
              where: {
                programId,
                landerPublishedAt: null,
              },
              data: {
                landerData: landerDataInput,
              },
            });
            console.log(
              `Updated data for ${updatedGroups.count} other groups based on default group lander data...`,
            );
          }

          if (applicationFormDataInput) {
            console.log(
              "Default application form data updated, updating other groups (that don't have a custom data)...",
            );
            const updatedGroups = await prisma.partnerGroup.updateMany({
              where: {
                programId,
                applicationFormPublishedAt: null,
              },
              data: {
                applicationFormData: applicationFormDataInput,
              },
            });
            console.log(
              `Updated data for ${updatedGroups.count} other groups based on default group application form`,
            );
          }
        }
      })(),
    );

    return {
      success: true,
      applicationFormData: programApplicationFormSchema.parse(
        updatedGroup.applicationFormData,
      ),
      landerData: programLanderSchema.parse(updatedGroup.landerData),
      program: ProgramWithLanderDataSchema.parse(updatedProgram),
    };
  });
