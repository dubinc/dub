import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import { MAX_PLATFORMS_PER_TYPE } from "@/lib/social-utils";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

/**
 * Safety-net cron that enforces the per-type handle limit in case the
 * application-level guard is ever bypassed (there is no DB-level unique key).
 * For any (partnerId, type) group over the limit, it keeps the handles to
 * retain — verified first, then oldest — and deletes the most-recently-added
 * excess.
 *
 * Runs daily. GET /api/cron/partner-platforms/enforce-limits
 */
export const GET = withCron(async () => {
  const overLimitGroups = await prisma.partnerPlatform.groupBy({
    by: ["partnerId", "type"],
    _count: {
      id: true,
    },
    having: {
      id: {
        _count: {
          gt: MAX_PLATFORMS_PER_TYPE,
        },
      },
    },
    orderBy: {
      partnerId: "asc",
    },
    take: 100,
  });

  if (overLimitGroups.length === 0) {
    return logAndRespond("No partners over the per-type platform limit.");
  }

  let trimmedRows = 0;

  for (const { partnerId, type } of overLimitGroups) {
    const platforms = await prisma.partnerPlatform.findMany({
      where: {
        partnerId,
        type,
      },
      select: {
        id: true,
        verifiedAt: true,
        createdAt: true,
      },
    });

    // Retain verified handles first, then the oldest; delete the rest
    const sortedPlatforms = platforms.sort((a, b) => {
      const aVerified = a.verifiedAt ? 1 : 0;
      const bVerified = b.verifiedAt ? 1 : 0;

      if (aVerified !== bVerified) {
        return bVerified - aVerified;
      }

      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const excessIds = sortedPlatforms
      .slice(MAX_PLATFORMS_PER_TYPE)
      .map((r) => r.id);

    if (excessIds.length > 0) {
      await prisma.partnerPlatform.deleteMany({
        where: {
          id: {
            in: excessIds,
          },
        },
      });

      trimmedRows += excessIds.length;

      console.log(
        `Trimmed ${excessIds.length} excess ${type} handle(s) for partner ${partnerId}.`,
      );
    }
  }

  return logAndRespond(
    `Enforced per-type platform limit: trimmed ${trimmedRows} row(s) across ${overLimitGroups.length} group(s).`,
  );
});
