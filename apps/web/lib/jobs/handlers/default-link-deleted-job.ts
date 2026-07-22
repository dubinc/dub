import { bulkDeleteLinks } from "@/lib/api/links/bulk-delete-links";
import { includeProgramEnrollment } from "@/lib/api/links/include-program-enrollment";
import { includeTags } from "@/lib/api/links/include-tags";
import { CRON_BATCH_SIZE } from "@/lib/cron";
import { deleteDiscountCodes } from "@/lib/discounts/delete-discount-code";
import { processInBatches } from "@dub/utils";
import * as z from "zod/v4";
import { prisma } from "../../prisma";
import { defineJob } from "../index";

const inputSchema = z.object({
  defaultLinkId: z.string(),
});

const MAX_BATCHES = 20;

// Job to delete a PartnerGroupDefaultLink and all its link associations
export const defaultLinkDeletedJob = defineJob({
  name: "default-link-deleted-job",
  schema: inputSchema,
  async handle(input) {
    const { defaultLinkId } = input;

    const defaultLink = await prisma.partnerGroupDefaultLink.findUnique({
      where: {
        id: defaultLinkId,
      },
      select: {
        groupId: true,
      },
    });

    if (!defaultLink) {
      console.error(
        `[defaultLinkDeletedJob] Default link ${defaultLinkId} not found. Skipping...`,
      );
      return;
    }

    if (defaultLink.groupId !== null) {
      console.error(
        `[defaultLinkDeletedJob] Default link ${defaultLinkId} not marked for deletion. Skipping...`,
      );
      return;
    }

    // Find the links to delete
    // Only delete links that have no clicks / activity
    const linksToDelete = await prisma.link.findMany({
      where: {
        partnerGroupDefaultLinkId: defaultLinkId,
        clicks: 0,
      },
      take: CRON_BATCH_SIZE,
      include: {
        ...includeTags,
        ...includeProgramEnrollment,
      },
    });

    // If there are links to delete, delete the discount codes and the links
    if (linksToDelete.length > 0) {
      const linkIds = linksToDelete.map(({ id }) => id);

      const discountCodesToDelete = await prisma.discountCode.findMany({
        where: {
          linkId: {
            in: linkIds,
          },
        },
        include: {
          discount: {
            select: {
              provider: true,
            },
          },
        },
      });

      await deleteDiscountCodes(discountCodesToDelete);

      const deletedLinks = await prisma.link.deleteMany({
        where: {
          id: {
            in: linkIds,
          },
        },
      });

      console.log(
        `Deleted ${deletedLinks.count} links for default link ${defaultLinkId}.`,
      );

      if (deletedLinks.count > 0) {
        await bulkDeleteLinks(linksToDelete);
      }
    }

    // More associations remain — queue the next batch.
    if (linksToDelete.length === CRON_BATCH_SIZE) {
      await defaultLinkDeletedJob.dispatch(
        {
          defaultLinkId,
        },
        {
          delay: 1,
          label: defaultLinkId,
        },
      );
      return;
    }

    // No more links with activity left, remove the partner group default link id from any remaining links (that have no activity)
    const { hasMore } = await processInBatches(MAX_BATCHES, () =>
      prisma.link.updateMany({
        where: {
          partnerGroupDefaultLinkId: defaultLinkId,
        },
        data: {
          partnerGroupDefaultLinkId: null,
        },
        limit: CRON_BATCH_SIZE,
      }),
    );

    if (hasMore) {
      await defaultLinkDeletedJob.dispatch(
        {
          defaultLinkId,
        },
        {
          delay: 1,
          label: defaultLinkId,
        },
      );
      return;
    }

    // Finally, delete the partner group default link
    await prisma.partnerGroupDefaultLink.delete({
      where: {
        id: defaultLinkId,
      },
    });

    console.log(
      `[defaultLinkDeletedJob] Deleted partner group default link ${defaultLinkId}.`,
    );
  },
});
