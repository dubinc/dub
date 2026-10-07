import { releaseAllHoldCommissions } from "@/lib/api/fraud/release-all-hold-commissions";
import { withCron } from "@/lib/cron/with-cron";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  programId: z.string(),
});

// POST /api/cron/fraud/release-all-hold-commissions
export const POST = withCron(async ({ rawBody }) => {
  const { programId } = inputSchema.parse(JSON.parse(rawBody));

  const releasedCount = await releaseAllHoldCommissions({
    programId,
  });

  return logAndRespond(
    `Released ${releasedCount} hold commissions for program ${programId}.`,
  );
});
