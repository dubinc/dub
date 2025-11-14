"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { updatePartnerTagsSchema } from "@/lib/zod/schemas/partner-tags";
import { prisma } from "@dub/prisma";
import { authActionClient } from "../../safe-action";

// Update a partner's tags
export const updatePartnerTagsAction = authActionClient
  .schema(updatePartnerTagsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const {
      partnerIds: partnerIdsInput,
      addTagIds: addTagIdsInput,
      removeTagIds: removeTagIdsInput,
    } = parsedInput;

    const partnerIds = [...new Set(partnerIdsInput)];
    const addTagIds = [...new Set(addTagIdsInput)];
    const removeTagIds = [...new Set(removeTagIdsInput)];

    const programId = getDefaultProgramIdOrThrow(workspace);

    if (partnerIds.length === 0)
      throw new Error("At least one partner ID is required.");

    const [partnerCount, addTagCount] = await Promise.all([
      prisma.programEnrollment.count({
        where: {
          programId,
          partnerId: {
            in: partnerIds,
          },
        },
      }),
      prisma.partnerTag.count({
        where: {
          programId,
          id: {
            in: addTagIds,
          },
        },
      }),
    ]);

    if (partnerCount !== partnerIds.length)
      throw new Error("One or more partners are not enrolled in the program.");

    if (addTagCount !== addTagIds?.length)
      throw new Error("One or more tags are not valid.");

    const addTagCombos = addTagIds.flatMap((partnerTagId) =>
      partnerIds.map((partnerId) => ({ partnerId, partnerTagId })),
    );

    await prisma.$transaction(async (tx) => {
      await Promise.all([
        tx.programPartnerTag.deleteMany({
          where: {
            programId,
            partnerId: {
              in: partnerIds,
            },
            partnerTagId: {
              in: removeTagIds,
            },
          },
        }),
        tx.programPartnerTag.createMany({
          data: addTagCombos.map(({ partnerId, partnerTagId }) => ({
            programId,
            partnerId,
            partnerTagId,
          })),
          skipDuplicates: true,
        }),
      ]);
    });
  });
