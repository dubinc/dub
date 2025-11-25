"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { isStored, storage } from "@/lib/storage";
import { ProgramLanderData } from "@/lib/types";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { programApplicationFormSchema } from "@/lib/zod/schemas/program-application-form";
import {
  programLanderImageBlockSchema,
  programLanderSchema,
} from "@/lib/zod/schemas/program-lander";
import { prisma } from "@dub/prisma";
import { isFulfilled, isRejected, nanoid, R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { revalidatePath } from "next/cache";
import { z } from "zod";
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
      landerData: landerDataInputRaw,
    } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);
    const group = await getGroupOrThrow({
      programId,
      groupId,
      includeExpandedFields: true,
    });

    const { program } = group;

    const uploadLogo = logo && !isStored(logo);
    const uploadWordmark = wordmark && !isStored(wordmark);

    const [logoUrl, wordmarkUrl] = await Promise.all([
      uploadLogo
        ? storage
            .upload({
              key: `programs/${programId}/logo_${nanoid(7)}`,
              body: logo,
            })
            .then(({ url }) => url)
        : undefined,
      uploadWordmark
        ? storage
            .upload({
              key: `programs/${programId}/wordmark_${nanoid(7)}`,
              body: wordmark,
            })
            .then(({ url }) => url)
        : undefined,
    ]);

    const landerDataInput = landerDataInputRaw
      ? await uploadLanderDataImages({
          landerData: landerDataInputRaw,
          programId,
        })
      : landerDataInputRaw;

    const updatedGroup = await prisma.partnerGroup.update({
      where: {
        id: groupId,
      },
      data: {
        logo: logoUrl,
        wordmark: wordmarkUrl,
        brandColor,
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

    waitUntil(
      (async () => {
        const res = await Promise.allSettled([
          /*
         Revalidate public pages if the following fields were updated:
         - lander data
         - application form data
        */
          ...(landerDataInput || applicationFormDataInput
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
            action: "group.updated",
            description: `Group ${updatedGroup.name} (${group.id}) updated`,
            actor: user,
            targets: [
              {
                type: "group",
                id: updatedGroup.id,
                metadata: updatedGroup,
              },
            ],
          }),
        ]);

        console.log(
          `Completed waitUntil steps for group branding update: ${JSON.stringify(res, null, 2)}`,
        );

        if (group.slug === DEFAULT_PARTNER_GROUP.slug) {
          await Promise.all(
            [
              { item: "logo", oldValue: group.logo, newValue: logoUrl },
              {
                item: "wordmark",
                oldValue: group.wordmark,
                newValue: wordmarkUrl,
              },
              {
                item: "brandColor",
                oldValue: group.brandColor,
                newValue: brandColor,
              },
            ]
              .filter(
                ({ oldValue, newValue }) =>
                  newValue !== undefined && oldValue !== newValue,
              )
              .map(async ({ item, oldValue, newValue }) => {
                console.log(
                  `Default group's ${item} updated, updating other groups (that have the same ${item})...`,
                );
                const updatedGroups = await prisma.partnerGroup.updateMany({
                  where: {
                    programId,
                    [item]: oldValue,
                  },
                  data: {
                    [item]: newValue,
                  },
                });
                console.log(
                  `Updated ${updatedGroups.count} other groups based on default group's ${item}`,
                );
                if (item === "logo") {
                  await prisma.program.update({
                    where: {
                      id: programId,
                    },
                    data: {
                      logo: newValue,
                    },
                  });
                }
              }),
          );

          await Promise.all(
            [
              {
                item: "landerData",
                data: landerDataInput,
                conditionField: "landerPublishedAt",
              },
              {
                item: "applicationFormData",
                data: applicationFormDataInput,
                conditionField: "applicationFormPublishedAt",
              },
            ]
              .filter(({ data }) => data !== undefined)
              .map(async ({ item, data, conditionField }) => {
                console.log(
                  `Default ${item} updated, updating other groups (that have a null ${conditionField})...`,
                );
                const updatedGroups = await prisma.partnerGroup.updateMany({
                  where: {
                    programId,
                    [conditionField]: null,
                  },
                  data: {
                    [item]: data,
                  },
                });
                console.log(
                  `Updated ${updatedGroups.count} other groups based on default group ${item}`,
                );
              }),
          );
        }
      })(),
    );

    return {
      success: true,
      applicationFormData: programApplicationFormSchema.parse(
        updatedGroup.applicationFormData,
      ),
      landerData: programLanderSchema.parse(updatedGroup.landerData),
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
        await storage.upload({
          key: `programs/${programId}/lander/image_${nanoid(7)}`,
          body: url,
        })
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
