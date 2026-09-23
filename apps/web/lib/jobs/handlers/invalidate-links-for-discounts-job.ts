import { linkCache } from "@/lib/api/links/cache";
import { CRON_BATCH_SIZE } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { LinkProps } from "@/lib/types";
import { chunk } from "@dub/utils";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.discriminatedUnion("type", [
  // Discount is still assigned to enrollments or link overrides.
  z.object({
    type: z.literal("discount"),
    discountId: z.string(),
    phase: z.enum(["enrollment", "linkReward"]).optional(),
    startingAfter: z.string().optional(),
  }),

  // Discount was unassigned or deleted; expire these partners' program links.
  z.object({
    type: z.literal("partners"),
    programId: z.string(),
    partnerIds: z.array(z.string()).min(1),
  }),
]);

type InvalidateLinksForDiscountsInput = z.infer<typeof inputSchema>;
type DiscountInput = Extract<
  InvalidateLinksForDiscountsInput,
  { type: "discount" }
>;
type PartnersInput = Extract<
  InvalidateLinksForDiscountsInput,
  { type: "partners" }
>;

// Clears Redis cache for partner links affected by a discount change.
// - "discount": find links via enrollments/link rewards that still have this discount
// - "partners": find links by partner ids (used after the discount was removed)
export const invalidateLinksForDiscountsJob = defineJob({
  name: "invalidate-links-for-discounts-job",
  schema: inputSchema,
  async handle(input) {
    if (input.type === "partners") {
      await invalidateLinksByPartnerIds(input);
      return;
    }

    await invalidateLinksByDiscountId(input);
  },
});

async function invalidateLinksByPartnerIds({
  programId,
  partnerIds,
}: PartnersInput) {
  const partnerIdBatch = partnerIds.slice(0, CRON_BATCH_SIZE);
  const remainingPartnerIds = partnerIds.slice(CRON_BATCH_SIZE);

  const links = await prisma.link.findMany({
    where: {
      programId,
      partnerId: {
        in: partnerIdBatch,
      },
    },
    select: {
      domain: true,
      key: true,
    },
  });

  await expireLinkCache(links);

  if (remainingPartnerIds.length > 0) {
    await invalidateLinksForDiscountsJob.dispatch({
      type: "partners",
      programId,
      partnerIds: remainingPartnerIds,
    });
  }
}

async function invalidateLinksByDiscountId({
  discountId,
  phase = "enrollment",
  startingAfter,
}: DiscountInput) {
  if (phase === "enrollment") {
    await invalidateEnrollmentLinks({
      discountId,
      startingAfter,
    });
    return;
  }

  await invalidateLinkRewardLinks({
    discountId,
    startingAfter,
  });
}

async function invalidateEnrollmentLinks({
  discountId,
  startingAfter,
}: {
  discountId: string;
  startingAfter?: string;
}) {
  const enrollments = await prisma.programEnrollment.findMany({
    where: {
      discountId,
    },
    select: {
      id: true,
      links: {
        select: {
          domain: true,
          key: true,
        },
      },
    },
    orderBy: {
      id: "asc",
    },
    take: CRON_BATCH_SIZE,
    ...(startingAfter && {
      skip: 1,
      cursor: {
        id: startingAfter,
      },
    }),
  });

  await expireLinkCache(enrollments.flatMap((enrollment) => enrollment.links));

  if (enrollments.length === CRON_BATCH_SIZE) {
    await invalidateLinksForDiscountsJob.dispatch({
      type: "discount",
      discountId,
      phase: "enrollment",
      startingAfter: enrollments[enrollments.length - 1].id,
    });
    return;
  }

  await invalidateLinksForDiscountsJob.dispatch({
    type: "discount",
    discountId,
    phase: "linkReward",
  });
}

async function invalidateLinkRewardLinks({
  discountId,
  startingAfter,
}: {
  discountId: string;
  startingAfter?: string;
}) {
  const linkRewards = await prisma.linkReward.findMany({
    where: {
      discountId,
    },
    select: {
      id: true,
      link: {
        select: {
          domain: true,
          key: true,
        },
      },
    },
    orderBy: {
      id: "asc",
    },
    take: CRON_BATCH_SIZE,
    ...(startingAfter && {
      skip: 1,
      cursor: {
        id: startingAfter,
      },
    }),
  });

  await expireLinkCache(linkRewards.map(({ link }) => link));

  if (linkRewards.length === CRON_BATCH_SIZE) {
    await invalidateLinksForDiscountsJob.dispatch({
      type: "discount",
      discountId,
      phase: "linkReward",
      startingAfter: linkRewards[linkRewards.length - 1].id,
    });
  }
}

async function expireLinkCache(links: Pick<LinkProps, "domain" | "key">[]) {
  if (links.length === 0) {
    return;
  }

  const linkChunks = chunk(links, 100);

  for (const linkChunk of linkChunks) {
    await linkCache.expireMany(linkChunk);
  }

  console.info(`Expired cache for ${links.length} links.`);
}
