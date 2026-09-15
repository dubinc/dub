import { linkCache } from "@/lib/api/links/cache";
import { prisma } from "@/lib/prisma";
import { chunk } from "@dub/utils";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.discriminatedUnion("type", [
  // Discount is still assigned to enrollments or link overrides.
  z.object({
    type: z.literal("discount"),
    discountId: z.string(),
  }),

  // Discount was unassigned or deleted; expire these partners' program links.
  z.object({
    type: z.literal("partners"),
    programId: z.string(),
    partnerIds: z.array(z.string()).min(1),
  }),
]);

type InvalidateLinksForDiscountsInput = z.infer<typeof inputSchema>;

// Invalidates the partner link cache when a discount is created/updated/deleted.
export const invalidateLinksForDiscountsJob = defineJob({
  name: "invalidate-links-for-discounts-job",
  schema: inputSchema,
  async handle(input) {
    const links = await findLinksToInvalidate(input);

    if (links.length === 0) {
      console.info(`No links found to invalidate for discount. Skipping...`);
      return;
    }

    const linkChunks = chunk(links, 100);

    for (const linkChunk of linkChunks) {
      await linkCache.expireMany(linkChunk);
    }

    console.info(`Expired cache for ${links.length} links.`);
  },
});

async function findLinksToInvalidate(input: InvalidateLinksForDiscountsInput) {
  if (input.type === "discount") {
    return prisma.link.findMany({
      where: {
        OR: [
          {
            programEnrollment: {
              is: {
                discountId: input.discountId,
              },
            },
          },
          {
            linkReward: {
              is: {
                discountId: input.discountId,
              },
            },
          },
        ],
      },
      select: {
        domain: true,
        key: true,
      },
    });
  }

  return prisma.link.findMany({
    where: {
      programId: input.programId,
      partnerId: {
        in: input.partnerIds,
      },
    },
    select: {
      domain: true,
      key: true,
    },
  });
}
