import { sendEmail } from "@dub/email";
import PartnerPaypalPayoutFailed from "@dub/email/templates/partner-paypal-payout-failed";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { payoutsItemSchema } from "./utils";

const PAYPAL_TO_DUB_STATUS = {
  "PAYMENT.PAYOUTS-ITEM.BLOCKED": "failed",
  "PAYMENT.PAYOUTS-ITEM.CANCELED": "canceled",
  "PAYMENT.PAYOUTS-ITEM.DENIED": "failed",
  "PAYMENT.PAYOUTS-ITEM.FAILED": "failed",
  "PAYMENT.PAYOUTS-ITEM.HELD": "processing",
  "PAYMENT.PAYOUTS-ITEM.REFUNDED": "failed",
  "PAYMENT.PAYOUTS-ITEM.RETURNED": "failed",
  "PAYMENT.PAYOUTS-ITEM.UNCLAIMED": "processing",
};

export async function payoutsItemFailed(event: any) {
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

  const payoutStatus = PAYPAL_TO_DUB_STATUS[body.event_type];
  const failureReason = body.resource.errors?.message;

  await prisma.payout.update({
    where: {
      id: payout.id,
    },
    data: {
      paypalTransferId: payoutItemId,
      status: payoutStatus,
      failureReason,
    },
  });

  if (payoutStatus === "processing") {
    await log({
      message: `Paypal payout is stuck in processing for invoice ${invoiceId} and partner ${paypalEmail}. PayPal webhook status: ${body.event_type}.${
        failureReason ? ` Failure reason: ${failureReason}` : ""
      }`,
      type: "errors",
    });
    return; // we only send emails for failed payouts
  }

  await Promise.all([
    payout.partner.email
      ? sendEmail({
          subject: `Your recent partner payout from ${payout.program.name} failed`,
          email: payout.partner.email,
          react: PartnerPaypalPayoutFailed({
            email: payout.partner.email,
            program: {
              name: payout.program.name,
            },
            payout: {
              amount: payout.amount,
              failureReason,
            },
            partner: {
              paypalEmail: payout.partner.paypalEmail!,
            },
          }),
          variant: "notifications",
        })
      : Promise.resolve(),

    log({
      message: `Paypal payout status changed to ${body.event_type} for invoice ${invoiceId} and partner ${paypalEmail}`,
      type: "errors",
    }),
  ]);
}
