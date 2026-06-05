import { withCron } from "@/lib/cron/with-cron";
import {
  createReferralCommission,
  CreateReferralCommissionArgs,
} from "@/lib/partner-referrals/create-referral-commission";
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

  let args: CreateReferralCommissionArgs;

  if ("sourceCommissionId" in inputParsed) {
    args = {
      source: "commission",
      sourceCommissionId: inputParsed.sourceCommissionId,
    };
  } else {
    args = {
      source: "partner",
      programId: inputParsed.programId,
      partnerId: inputParsed.partnerId,
    };
  }

  const { commission, reason } = await createReferralCommission(args);

  if (commission) {
    return logAndRespond(
      `Referral commission ${commission.id} created successfully.`,
    );
  }

  return logAndRespond(reason ?? "Referral commission creation skipped.");
});
