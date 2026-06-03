import {
  voidReferralCommissions,
  voidReferralCommissionsSchema,
} from "@/lib/api/commissions/void-referral-commissions";
import { withCron } from "@/lib/cron/with-cron";
import { logAndRespond } from "../../../utils";

export const dynamic = "force-dynamic";

// POST /api/cron/commissions/referrals/void
export const POST = withCron(async ({ rawBody }) => {
  const input = voidReferralCommissionsSchema.parse(JSON.parse(rawBody));

  await voidReferralCommissions(input);

  return logAndRespond(
    `Voided referral commissions for ${input.sourceCommissionIds.length} source commission(s).`,
  );
});
