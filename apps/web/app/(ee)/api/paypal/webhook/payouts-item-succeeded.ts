import { trackCommissionStatusUpdate } from "@/lib/api/commissions/track-commission-update-activity-log";
import { prisma } from "@/lib/prisma";
import { chunk, log } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { payoutsItemSchema } from "./utils";

export async function payoutsItemSucceeded(event: any) {
  const body = payoutsItemSchema.parse(event);

  let invoiceId = body.resource.sender_batch_id;
  const paypalEmail = body.resource.payout_item.receiver;
  const payoutItemId = body.resource.payout_item_id;
  const payoutId = body.resource.payout_item.sender_item_id;

  if (invoiceId.includes("-")) {
    invoiceId = invoiceId.split("-")[0];
  }

  const payout = await prisma.payout.findUnique({
    where: {
      id: payoutId,
    },
    include: {
      partner: true,
      program: true,
    },
  });

  if (!payout) {
    console.log(
      `[PayPal] Payout not found for invoice ${invoiceId} and partner ${paypalEmail}`,
    );
    return;
  }

  if (payout.status === "completed") {
    console.log(
      `[PayPal] Payout already completed for invoice ${invoiceId} and partner ${paypalEmail}`,
    );
    return;
  }

  const commissions = await prisma.commission.findMany({
    where: {
      payoutId: payout.id,
    },
    select: {
      id: true,
      amount: true,
      earnings: true,
      status: true,
    },
  });

  await prisma.payout.update({
    where: {
      id: payout.id,
    },
    data: {
      paypalTransferId: payoutItemId,
      status: "completed",
      paidAt: payout.paidAt ?? new Date(), // preserve the paidAt if it already exists
      failureReason: null,
    },
  });

  const commissionIds = commissions.map((c) => c.id);

  let totalUpdatedCommissions = 0;
  for (const commissionIdsBatch of chunk(commissionIds, 250)) {
    try {
      const { count } = await prisma.commission.updateMany({
        where: {
          id: {
            in: commissionIdsBatch,
          },
        },
        data: {
          status: "paid",
        },
      });

      totalUpdatedCommissions += count;
      console.log(
        `Marked ${totalUpdatedCommissions}/${commissionIds.length} commissions as paid`,
      );
    } catch (error) {
      await log({
        message: `[PayPal payoutsItemSucceeded] Failed to mark commissions as paid for payouts ${payoutId}: ${error.message}`,
        type: "errors",
        mention: true,
      });
    }
  }

  waitUntil(
    trackCommissionStatusUpdate({
      workspaceId: payout.program.workspaceId,
      programId: payout.program.id,
      commissions,
      newStatus: "paid",
    }),
  );
}
