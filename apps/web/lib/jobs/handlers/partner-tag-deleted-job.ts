import * as z from "zod/v4";
import { includeProgramEnrollment } from "../../api/links/include-program-enrollment";
import { includeTags } from "../../api/links/include-tags";
import { CRON_BATCH_SIZE } from "../../cron";
import { prisma } from "../../prisma";
import { recordLink } from "../../tinybird";
import { defineJob } from "../index";

const inputSchema = z.object({
  partnerTagId: z.string(),
});

// Job to delete a partner tag and all its program–partner tag associations
export const partnerTagDeletedJob = defineJob({
  name: "partner-tag-deleted-job",
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

    if (programPartnerTags.length > 0) {
      // Delete the program–partner tag associations.
      const { count } = await prisma.programPartnerTag.deleteMany({
        where: {
          id: {
            in: programPartnerTags.map(({ id }) => id),
          },
        },
      });

      console.log(
        `[partnerTagDeletedJob] Deleted ${count} program–partner tag associations.`,
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

      // More associations remain — queue the next batch.
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
    }

    // No more program–partner tag associations left. Delete the partner tag.
    await prisma.partnerTag.delete({
      where: {
        id: partnerTagId,
      },
    });

    console.log(
      `[partnerTagDeletedJob] Partner tag ${partnerTagId} deleted from database.`,
    );
  },
});

export const job = partnerTagDeletedJob;
