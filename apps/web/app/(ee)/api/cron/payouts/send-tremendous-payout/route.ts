import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@dub/prisma";
import {
  PartnerPayoutMethod,
  PayoutMode,
  PayoutStatus,
} from "@dub/prisma/client";
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

  const partner = await prisma.partner.findUniqueOrThrow({
    where: {
      id: partnerId,
    },
    select: {
      id: true,
      email: true,
      tremendousEmail: true,
      payoutsEnabledAt: true,
    },
  });

  if (!partner.tremendousEmail || !partner.payoutsEnabledAt) {
    throw new Error(
      `Partner ${partner.email} does not have an active payout account.`,
    );
  }

  const payouts = await prisma.payout.findMany({
    where: {
      partnerId,
      invoiceId,
      status: PayoutStatus.processing,
      mode: PayoutMode.internal,
      method: PartnerPayoutMethod.tremendous,
    },
  });

  if (payouts.length === 0) {
    return logAndRespond(`No payouts for sending via Tremendous, skipping...`);
  }

  // TODO:
  // Send the money

  return logAndRespond(
    `Received send-tremendous-payout job for partner ${partnerId} and invoice ${invoiceId}`,
  );
});
