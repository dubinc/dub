import { releaseHoldCommissions } from "@/lib/api/fraud/release-hold-commissions";
import { withCron } from "@/lib/cron/with-cron";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  programId: z.string(),
  partnerId: z.string(),
  resolvedGroupIds: z.array(z.string()),
});

// POST /api/cron/fraud/release-hold-commissions
export const POST = withCron(async ({ rawBody }) => {
  const { programId, partnerId, resolvedGroupIds } = inputSchema.parse(
    JSON.parse(rawBody),
  );

  const releasedCount = await releaseHoldCommissions({
    programId,
    partnerId,
    resolvedGroupIds,
  });

  return logAndRespond(
    `Released ${releasedCount} hold commissions for partner ${partnerId} in program ${programId}.`,
  );
});
