import { linkCache } from "@/lib/api/links/cache";
import { CRON_BATCH_SIZE } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { chunk, pluck } from "@dub/utils";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.discriminatedUnion("by", [
  // Known partners — enrollment/link discount already updated for these ids.
  z.object({
    by: z.literal("partners"),
    programId: z.string(),
    partnerIds: z.array(z.string()).min(1),
  }),

  // Discover who still references this discountId within a program.
  z.object({
    by: z.literal("discount"),
    programId: z.string(),
    discountId: z.string(),
    source: z.enum(["enrollment", "linkReward"]).optional(),
    startingAfter: z.string().optional(),
  }),
]);

type InvalidateLinksForDiscountsInput = z.infer<typeof inputSchema>;
type PartnersInput = Extract<
  InvalidateLinksForDiscountsInput,
  { by: "partners" }
>;
type DiscountInput = Extract<
  InvalidateLinksForDiscountsInput,
  { by: "discount" }
>;

// Clears Redis cache when a link's resolved discount would change
// (COALESCE(LinkReward.discountId, ProgramEnrollment.discountId)):
// 1. Enrollment discount changed → by: "partners" (or expireMany at call site)
// 2. Link override changed → expireMany at call site (or by: "partners")
// 3. Discount fields changed while still assigned → by: "discount"
// 4. Discount already unassigned → by: "partners"
export const invalidateLinksForDiscountsJob = defineJob({
  name: "invalidate-links-for-discounts-job",
  schema: inputSchema,
  async handle(input) {
    if (input.by === "partners") {
      await expirePartners(input);
      return;
    }

    await scanDiscount(input);
  },
});

async function expirePartners({ programId, partnerIds }: PartnersInput) {
  const partnerIdBatch = partnerIds.slice(0, CRON_BATCH_SIZE);
  const remainingPartnerIds = partnerIds.slice(CRON_BATCH_SIZE);

  await expirePartnerLinks({
    programId,
    partnerIds: partnerIdBatch,
  });

  if (remainingPartnerIds.length > 0) {
    await invalidateLinksForDiscountsJob.dispatch({
      by: "partners",
      programId,
      partnerIds: remainingPartnerIds,
    });
  }
}

// Page enrollments then linkRewards within one program; expire those partners' links.
async function scanDiscount({
  programId,
  discountId,
  source = "enrollment",
  startingAfter,
}: DiscountInput) {
  if (source === "enrollment") {
    const enrollments = await prisma.programEnrollment.findMany({
      where: {
        programId,
        discountId,
      },
      select: {
        id: true,
        partnerId: true,
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

    await expirePartnerLinks({
      programId,
      partnerIds: pluck(enrollments, "partnerId"),
    });

    if (enrollments.length === CRON_BATCH_SIZE) {
      await invalidateLinksForDiscountsJob.dispatch({
        by: "discount",
        programId,
        discountId,
        source: "enrollment",
        startingAfter: enrollments[enrollments.length - 1].id,
      });
      return;
    }

    await invalidateLinksForDiscountsJob.dispatch({
      by: "discount",
      programId,
      discountId,
      source: "linkReward",
    });
    return;
  }

  const linkRewards = await prisma.linkReward.findMany({
    where: {
      discountId,
      link: {
        programId,
      },
    },
    select: {
      id: true,
      link: {
        select: {
          partnerId: true,
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

  await expirePartnerLinks({
    programId,
    partnerIds: [
      ...new Set(
        linkRewards
          .map(({ link }) => link.partnerId)
          .filter((id): id is string => Boolean(id)),
      ),
    ],
  });

  if (linkRewards.length === CRON_BATCH_SIZE) {
    await invalidateLinksForDiscountsJob.dispatch({
      by: "discount",
      programId,
      discountId,
      source: "linkReward",
      startingAfter: linkRewards[linkRewards.length - 1].id,
    });
  }
}

async function expirePartnerLinks({
  programId,
  partnerIds,
}: {
  programId: string;
  partnerIds: string[];
}) {
  if (partnerIds.length === 0) {
    return;
  }

  const links = await prisma.link.findMany({
    where: {
      programId,
      partnerId: {
        in: partnerIds,
      },
    },
    select: {
      domain: true,
      key: true,
    },
  });

  if (links.length === 0) {
    return;
  }

  for (const linkChunk of chunk(links, 100)) {
    await linkCache.expireMany(linkChunk);
  }

  console.info(`Expired cache for ${links.length} links.`);
}
