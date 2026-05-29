import { withCron } from "@/lib/cron/with-cron";
import { sendTremendousPayouts } from "@/lib/tremendous/send-tremendous-payouts";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  partnerId: z.string(),
  invoiceId: z.string().optional(),
});

// POST /api/cron/payouts/send-tremendous-payout
export const POST = withCron(async ({ rawBody }) => {
  const { partnerId, invoiceId } = inputSchema.parse(JSON.parse(rawBody));

  await sendTremendousPayouts({
    partnerId,
    invoiceId,
  });

  return logAndRespond(
    `Processed send-tremendous-payout job for partner ${partnerId}.`,
  );
});
