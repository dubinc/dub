import * as z from "zod/v4";
import { includeProgramEnrollment } from "../../api/links/include-program-enrollment";
import { includeTags } from "../../api/links/include-tags";
import { CRON_BATCH_SIZE } from "../../cron";
import { prisma } from "../../prisma";
import { recordLink } from "../../tinybird";
import { defineJob } from "../index";

const inputSchema = z.object({
  tagId: z.string(),
});

// Job to delete a link tag and all its link associations
export const linkTagDeletedJob = defineJob({
  name: "link-tag-deleted-job",
  schema: inputSchema,
  async handle(input) {
    const { tagId } = input;

    const tag = await prisma.tag.findUnique({
      where: {
        id: tagId,
      },
      select: {
        projectId: true,
      },
    });

    if (!tag) {
      console.error(
        `[linkTagDeletedJob] Link tag ${tagId} not found. Skipping...`,
      );
      return;
    }

    if (tag.projectId !== null) {
      console.error(
        `[linkTagDeletedJob] Link tag ${tagId} not marked for deletion. Skipping...`,
      );
      return;
    }

    const linkTags = await prisma.linkTag.findMany({
      where: {
        tagId,
      },
      select: {
        id: true,
        linkId: true,
      },
      take: CRON_BATCH_SIZE,
    });

    if (linkTags.length > 0) {
      const { count } = await prisma.linkTag.deleteMany({
        where: {
          id: {
            in: linkTags.map((linkTag) => linkTag.id),
          },
        },
      });

      console.log(
        `[linkTagDeletedJob] Deleted ${count} link–tag associations.`,
      );

      const links = await prisma.link.findMany({
        where: {
          id: {
            in: [...new Set(linkTags.map((linkTag) => linkTag.linkId))],
          },
        },
        include: {
          ...includeTags,
          ...includeProgramEnrollment,
        },
      });

      if (links.length > 0) {
        await recordLink(links);
      }

      // More associations remain — queue the next batch.
      if (linkTags.length === CRON_BATCH_SIZE) {
        await linkTagDeletedJob.dispatch(
          {
            tagId,
          },
          {
            delay: 1,
            label: tagId,
          },
        );
        return;
      }
    }

    // No more link–tag associations left. Delete the tag.
    await prisma.tag.delete({
      where: {
        id: tagId,
      },
    });

    console.log(`[linkTagDeletedJob] Link tag ${tagId} deleted from database.`);
  },
});
