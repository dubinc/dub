import { sendEmail } from "@dub/email";
import PartnerPayoutSent from "@dub/email/templates/partner-payout-sent";
import PartnerPaypalPayoutFailed from "@dub/email/templates/partner-paypal-payout-failed";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { z } from "zod";

const schema = z.object({
  event_type: z.string(),
  resource: z.object({
    sender_batch_id: z.string(), // Dub invoice id
    payout_item_id: z.string(),
    payout_item_fee: z.object({
      currency: z.string(),
      value: z.string(),
    }),
    payout_item: z.object({
      receiver: z.string(),
      sender_item_id: z.string(), // Dub payout id
    }),
    errors: z
      .object({
        name: z.string(),
        message: z.string(),
      })
      .nullable()
      .optional(),
  }),
});

const PAYPAL_TO_DUB_STATUS = {
  "PAYMENT.PAYOUTS-ITEM.BLOCKED": "failed",
  "PAYMENT.PAYOUTS-ITEM.CANCELED": "canceled",
  "PAYMENT.PAYOUTS-ITEM.DENIED": "failed",
  "PAYMENT.PAYOUTS-ITEM.FAILED": "failed",
  "PAYMENT.PAYOUTS-ITEM.HELD": "processing",
  "PAYMENT.PAYOUTS-ITEM.REFUNDED": "failed",
  "PAYMENT.PAYOUTS-ITEM.RETURNED": "failed",
};

export async function payoutStatusChanged(event: any) {
  const body = schema.parse(event);

  const invoiceId = body.resource.sender_batch_id;
  const paypalEmail = body.resource.payout_item.receiver;
  const payoutItemId = body.resource.payout_item_id;
  const payoutId = body.resource.payout_item.sender_item_id;

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

  if (body.event_type === "PAYMENT.PAYOUTS-ITEM.SUCCEEDED") {
    if (payout.status === "completed") {
      console.log(
        `[PayPal] Payout already completed for invoice ${invoiceId} and partner ${paypalEmail}`,
      );
      return;
    }

    await Promise.all([
      prisma.payout.update({
        where: {
          id: payout.id,
        },
        data: {
          paypalTransferId: payoutItemId,
          status: "completed",
          paidAt: new Date(),
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

      payout.partner.email &&
        sendEmail({
          subject: "You've been paid!",
          email: payout.partner.email,
          react: PartnerPayoutSent({
            email: payout.partner.email,
            program: payout.program,
            payout: {
              id: payout.id,
              amount: payout.amount,
              startDate: payout.periodStart,
              endDate: payout.periodEnd,
            },
          }),
          variant: "notifications",
        }),
    ]);

    return;
  }

  // For all other status, we need to update the payout status
  const failureReason = body.resource.errors?.message;

  await Promise.all([
    // Update the payout status
    prisma.payout.update({
      where: {
        id: payout.id,
      },
      data: {
        paypalTransferId: payoutItemId,
        status: PAYPAL_TO_DUB_STATUS[body.event_type],
        failureReason,
      },
    }),

    // Send an email to the partner about the payout status change
    payout.partner.email &&
      sendEmail({
        subject: `Your recent partner payout from ${payout.program.name} failed`,
        email: payout.partner.email,
        react: PartnerPaypalPayoutFailed({
          email: payout.partner.email,
          program: payout.program,
          payout: {
            amount: payout.amount,
            failureReason,
          },
          partner: {
            paypalEmail: payout.partner.paypalEmail!,
          },
        }),
        variant: "notifications",
      }),

    // Send an alert to Slack
    log({
      message: `Paypal payout status changed to ${body.event_type} for invoice ${invoiceId} and partner ${paypalEmail}`,
      type: "errors",
    }),
  ]);
}
