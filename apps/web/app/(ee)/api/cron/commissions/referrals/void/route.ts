import {
  cancelReferralCommissionsBelowThreshold,
  voidReferralCommissions,
  voidReferralCommissionsSchema,
} from "@/lib/api/commissions/void-referral-commissions";
import { withCron } from "@/lib/cron/with-cron";
import { logAndRespond } from "../../../utils";

export const dynamic = "force-dynamic";

// POST /api/cron/commissions/referrals/void
export const POST = withCron(async ({ rawBody }) => {
  const {
    workspaceId,
    programId,
    userId,
    sourceCommissionIds,
    sourceCommissionStatus,
  } = voidReferralCommissionsSchema.parse(JSON.parse(rawBody));

  await voidReferralCommissions({
    workspaceId,
    programId,
    userId,
    sourceCommissionIds,
    sourceCommissionStatus,
  });

  await cancelReferralCommissionsBelowThreshold({
    workspaceId,
    userId,
    sourceCommissionIds,
    programId,
  });

  return logAndRespond(
    `Voided referral commissions for ${sourceCommissionIds.length} source commission(s).`,
  );
});
