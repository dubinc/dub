import * as z from "zod/v4";
import { includeProgramEnrollment } from "../api/links/include-program-enrollment";
import { includeTags } from "../api/links/include-tags";
import { CRON_BATCH_SIZE } from "../cron";
import { prisma } from "../prisma";
import { recordLink } from "../tinybird";
import { defineJob } from "./index";

const inputSchema = z.object({
  partnerTagId: z.string(),
});

// Job to delete a partner tag and all its program–partner tag associations
export const partnerTagDeletedJob = defineJob({
  name: "partnerTagDeleted",
  schema: inputSchema,
  async handle(input) {
    const { partnerTagId } = input;

    const partnerTag = await prisma.partnerTag.findUnique({
      where: {
        id: partnerTagId,
      },
      select: {
        programId: true,
      },
    });

    if (!partnerTag) {
      console.error(
        `[partnerTagDeletedJob] Partner tag ${partnerTagId} not found. Skipping...`,
      );
      return;
    }

    if (partnerTag.programId !== null) {
      console.error(
        `[partnerTagDeletedJob] Partner tag ${partnerTagId} not marked for deletion. Skipping...`,
      );
      return;
    }

    const programPartnerTags = await prisma.programPartnerTag.findMany({
      where: {
        partnerTagId,
      },
      select: {
        id: true,
        programEnrollment: {
          select: {
            id: true,
          },
        },
      },
      take: CRON_BATCH_SIZE,
    });

    // No more program–partner tag associations left. Delete the partner tag.
    if (programPartnerTags.length === 0) {
      const { count } = await prisma.partnerTag.deleteMany({
        where: {
          id: {
            in: [partnerTagId],
          },
        },
      });

      if (count === 0) {
        console.error(
          `[partnerTagDeletedJob] Partner tag ${partnerTagId} not found. Skipping...`,
        );
      } else {
        console.log(
          `[partnerTagDeletedJob] Partner tag ${partnerTagId} deleted from database.`,
        );
      }

      return;
    }

    // Delete the program–partner tag associations.
    const { count: programPartnerTagsDeleted } =
      await prisma.programPartnerTag.deleteMany({
        where: {
          id: {
            in: programPartnerTags.map(({ id }) => id),
          },
        },
      });

    console.log(
      `[partnerTagDeletedJob] Deleted ${programPartnerTagsDeleted} program–partner tag associations.`,
    );

    // Update the links to remove the partner tag from TB
    const linksToUpdate = await prisma.link.findMany({
      where: {
        programEnrollment: {
          id: {
            in: programPartnerTags.map((row) => row.programEnrollment.id),
          },
        },
      },
      include: {
        ...includeTags,
        ...includeProgramEnrollment,
      },
    });

    if (linksToUpdate.length > 0) {
      await recordLink(linksToUpdate);
    }

    // Queue the next job to delete the partner tag.
    if (programPartnerTags.length === CRON_BATCH_SIZE) {
      await partnerTagDeletedJob.dispatch(
        {
          partnerTagId,
        },
        {
          delay: 1,
          label: partnerTagId,
        },
      );
      return;
    }
  },
});
