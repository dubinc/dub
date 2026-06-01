import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@dub/prisma";
import { subMinutes } from "date-fns";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

// The discounts/process cron normally hard-deletes once enrollments are cleared, but a newer
// discount change for the same group can bump the version and skip stale jobs
// (e.g. delete then create), leaving the old row behind. This job is a safety net for those orphans.

// POST /api/cron/cleanup/orphaned-discounts
export const POST = withCron(async () => {
  const discounts = await prisma.discount.findMany({
    where: {
      programId: null,
      updatedAt: {
        lt: subMinutes(new Date(), 30), // only look for discounts older than 30 minutes ago
      },
    },
    select: {
      id: true,
      _count: {
        select: {
          discountCodes: true,
          programEnrollments: true,
        },
      },
    },
    orderBy: {
      updatedAt: "asc",
    },
    take: 100,
  });

  if (discounts.length === 0) {
    return logAndRespond("No orphaned discounts found.");
  }

  const discountsToDelete = discounts.filter((discount) => {
    return (
      discount._count.programEnrollments === 0 &&
      discount._count.discountCodes === 0
    );
  });

  console.log(
    `Found ${discountsToDelete.length} discounts to delete out of ${discounts.length} discounts (some of them are still referenced by program enrollments or discount codes).`,
  );

  if (discountsToDelete.length === 0) {
    return logAndRespond("No discounts to delete, skipping...");
  }

  const deletedDiscounts = await prisma.discount.deleteMany({
    where: {
      id: {
        in: discountsToDelete.map((discount) => discount.id),
      },
    },
  });

  return logAndRespond(
    `Finished deleting orphaned discounts (${deletedDiscounts.count} discounts deleted).`,
  );
});
