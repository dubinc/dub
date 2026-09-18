import { withCron } from "@/lib/cron/with-cron";
import { invalidateLinksForDiscountsJob } from "@/lib/jobs/handlers/invalidate-links-for-discounts-job";
import { prisma } from "@/lib/prisma";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  groupId: z.string(),
  partnerIds: z
    .array(z.string())
    .optional()
    .describe(
      "If provided, only invalidate the cache for the given partner ids.",
    ),
});

// Shim for in-flight QStash messages published to the old cron URL.
// New callers should dispatch invalidateLinksForDiscountsJob.
// POST /api/cron/links/invalidate-for-discounts
export const POST = withCron(async ({ rawBody }) => {
  const { groupId, partnerIds } = schema.parse(JSON.parse(rawBody));

  const group = await prisma.partnerGroup.findUnique({
    where: {
      id: groupId,
    },
    select: {
      programId: true,
    },
  });

  if (!group) {
    return logAndRespond(`Group ${groupId} not found.`, {
      logLevel: "error",
    });
  }

  const resolvedPartnerIds =
    partnerIds ??
    (
      await prisma.programEnrollment.findMany({
        where: {
          groupId,
        },
        select: {
          partnerId: true,
        },
      })
    ).map(({ partnerId }) => partnerId);

  if (resolvedPartnerIds.length === 0) {
    return logAndRespond(`No program enrollments found for group ${groupId}.`);
  }

  await invalidateLinksForDiscountsJob.dispatch({
    type: "partners",
    programId: group.programId,
    partnerIds: resolvedPartnerIds,
  });

  return logAndRespond(`Expired cache for partners in group ${groupId}.`);
});
