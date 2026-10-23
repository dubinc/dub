import { withCron } from "@/lib/cron/with-cron";
import { createReferralCommission } from "@/lib/partner-referrals/create-referral-commission";
import * as z from "zod/v4";
import { logAndRespond } from "../../../utils";

export const dynamic = "force-dynamic";

const inputSchema = z.union([
  z.object({ sourceCommissionId: z.string() }),
  z.object({ programId: z.string(), partnerId: z.string() }),
]);

// POST /api/cron/commissions/referrals/create
export const POST = withCron(async ({ rawBody }) => {
  const inputParsed = inputSchema.parse(JSON.parse(rawBody));

  const referralCommission = await createReferralCommission(inputParsed);

  if (referralCommission === null) {
    return logAndRespond("Referral commission creation skipped.");
  }

  return logAndRespond(
    `Referral commission ${referralCommission.id} created successfully.`,
  );
});
