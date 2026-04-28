import { trackCommissionStatusUpdate } from "@/lib/api/commissions/track-commission-update-activity-log";
import { prisma } from "@dub/prisma";
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

  await Promise.all([
    prisma.payout.update({
      where: {
        id: payout.id,
      },
      data: {
        paypalTransferId: payoutItemId,
        status: "completed",
        paidAt: payout.paidAt ?? new Date(), // preserve the paidAt if it already exists
        failureReason: null,
      },
    }),

    prisma.commission.updateMany({
      where: {
        payoutId: payout.id,
      },
      data: {
        status: "paid",
      },
    }),
  ]);

  await trackCommissionStatusUpdate({
    workspaceId: payout.program.workspaceId,
    programId: payout.program.id,
    commissions,
    newStatus: "paid",
  });
}
