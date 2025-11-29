import { sendEmail } from "@dub/email";
import PartnerPaypalPayoutFailed from "@dub/email/templates/partner-paypal-payout-failed";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { payoutsItemSchema } from "./utils";

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

  const failureReason = body.resource.errors?.message;

  await prisma.payout.update({
    where: {
      id: payout.id,
    },
    data: {
      paypalTransferId: payoutItemId,
      status: "failed",
      failureReason,
    },
  });

  await Promise.all([
    payout.partner.email
      ? sendEmail({
          subject: `Your recent partner payout from ${payout.program.name} failed`,
          to: payout.partner.email,
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
