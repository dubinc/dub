import { withCron } from "@/lib/cron/with-cron";
import { createReferralCommission } from "@/lib/partner-referrals/create-referral-commission";
import * as z from "zod/v4";
import { logAndRespond } from "../../../utils";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  sourceCommissionId: z
    .string()
    .describe(
      "The ID of the commission to calculate a referral commission for.",
    ),
});

// POST /api/cron/commissions/referrals/calculate
export const POST = withCron(async ({ rawBody }) => {
  const { sourceCommissionId } = inputSchema.parse(JSON.parse(rawBody));

  const commission = await createReferralCommission({
    sourceCommissionId,
  });

  if (!commission) {
    return logAndRespond(
      `Failed to create referral commission for source commission ${sourceCommissionId}.`,
      {
        status: 400,
      },
    );
  }

  return logAndRespond(
    `Referral commission ${commission.id} created successfully.`,
  );
});
