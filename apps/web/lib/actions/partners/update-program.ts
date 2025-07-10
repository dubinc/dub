"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getFolderOrThrow } from "@/lib/folder/get-folder-or-throw";
import { isStored, storage } from "@/lib/storage";
import { ProgramLanderData } from "@/lib/types";
import {
  programLanderImageBlockSchema,
  programLanderSchema,
} from "@/lib/zod/schemas/program-lander";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { isFulfilled, isRejected, nanoid, R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
import {
  ProgramWithLanderDataSchema,
  updateProgramSchema,
} from "../../zod/schemas/programs";
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
      linkStructure,
      supportEmail,
      helpUrl,
      termsUrl,
      holdingPeriodDays,
      minPayoutAmount,
      cookieLength,
      defaultFolderId,
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

    const landerData = landerDataInput
      ? await uploadLanderDataImages({ landerData: landerDataInput, programId })
      : landerDataInput;

    const updatedProgram = await prisma.program.update({
      where: {
        id: programId,
      },
      data: {
        name,
        logo: logoUrl ?? undefined,
        wordmark: wordmarkUrl ?? undefined,
        brandColor,
        landerData: landerData === null ? Prisma.JsonNull : landerData,
        landerPublishedAt: landerData ? new Date() : undefined,
        domain,
        url,
        linkStructure,
        supportEmail,
        helpUrl,
        termsUrl,
        cookieLength,
        holdingPeriodDays,
        minPayoutAmount,
        defaultFolderId,
      },
    });

    waitUntil(
      Promise.all([
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
        ...(name !== program.name ||
        logoUrl ||
        wordmarkUrl ||
        brandColor !== program.brandColor ||
        landerData
          ? [
              revalidatePath(`/partners.dub.co/${program.slug}`),
              revalidatePath(`/partners.dub.co/${program.slug}/apply`),
              revalidatePath(`/partners.dub.co/${program.slug}/apply/form`),
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
      program: ProgramWithLanderDataSchema.parse(updatedProgram),
    };
  });

/**
 * Uploads any foreign images from the lander data to R2 and updates the URLs in the lander data.
 */
async function uploadLanderDataImages({
  landerData: landerDataParam,
  programId,
}: {
  landerData: ProgramLanderData;
  programId: string;
}) {
  // Clone object to avoid mutating the original
  const landerData = JSON.parse(JSON.stringify(landerDataParam));

  const foreignImageUrls = (
    landerData.blocks.filter((block) => block.type === "image") as z.infer<
      typeof programLanderImageBlockSchema
    >[]
  )
    .map((block) => block.data.url)
    .filter(
      (url) => !url.startsWith(`${R2_URL}/programs/${programId}/lander/`),
    );

  if (foreignImageUrls.length <= 0) return landerData;

  // Upload images
  const results = await Promise.allSettled(
    foreignImageUrls.map(async (url) => ({
      url,
      uploadedUrl: (
        await storage.upload(
          `programs/${programId}/lander/image_${nanoid(7)}`,
          url,
        )
      ).url,
    })),
  );

  // Log failed uploads
  results.filter(isRejected).map((result) => {
    console.error("Failed to upload lander image", result.reason);
  });

  const fulfilled = results.filter(isFulfilled);
  if (fulfilled.length <= 0) return landerData;

  // Update URLs in the lander data
  landerData.blocks.forEach((block) => {
    if (block.type === "image") {
      const result = fulfilled.find(
        (result) => result.value.url === block.data.url,
      );
      if (result) {
        block.data.url = result.value.uploadedUrl;
      }
    }
  });

  return landerData;
}
