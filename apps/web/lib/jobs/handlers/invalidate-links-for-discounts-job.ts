import { linkCache } from "@/lib/api/links/cache";
import { prisma } from "@/lib/prisma";
import { chunk } from "@dub/utils";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({
  discountId: z.string(),
  partnerIds: z
    .array(z.string())
    .optional()
    .describe(
      "If provided, only invalidate the cache for the given partner ids.",
    ),
});

// Invalidates the partner link cache when a discount is created/updated/deleted.
export const invalidateLinksForDiscountsJob = defineJob({
  name: "invalidate-links-for-discounts-job",
  schema: inputSchema,
  async handle(input) {
    const { discountId, partnerIds } = input;

    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        discountId,
        ...(partnerIds && {
          partnerId: {
            in: partnerIds,
          },
        }),
      },
      select: {
        links: {
          select: {
            domain: true,
            key: true,
          },
        },
      },
    });

    if (programEnrollments.length === 0) {
      console.info(
        `No program enrollments found with discount ${discountId}. Skipping...`,
      );
      return;
    }

    const links = programEnrollments.flatMap((enrollment) => enrollment.links);

    if (links.length === 0) {
      console.info(
        `No links found for partners with discount ${discountId}. Skipping...`,
      );
      return;
    }

    const linkChunks = chunk(links, 100);

    for (const linkChunk of linkChunks) {
      const toExpire = linkChunk.map(({ domain, key }) => ({ domain, key }));
      await linkCache.expireMany(toExpire);
    }

    console.info(
      `Expired cache for ${links.length} links with discount ${discountId}.`,
    );
  },
});
