import {
  BELOW_MIN_WITHDRAWAL_FEE_CENTS,
  MIN_WITHDRAWAL_AMOUNT_CENTS,
} from "@/lib/partners/constants";
import { stripe } from "@/lib/stripe";
import { sendEmail } from "@dub/email";
import PartnerPayoutProcessed from "@dub/email/templates/partner-payout-processed";
import { prisma } from "@dub/prisma";
import { currencyFormatter, pluralize } from "@dub/utils";
import { Prisma } from "@prisma/client";
import { Payload } from "./utils";

export async function sendStripePayouts({ payload }: { payload: Payload }) {
  const { invoiceId } = payload;

  const commonInclude = Prisma.validator<Prisma.PayoutInclude>()({
    partner: {
      select: {
        id: true,
        email: true,
        stripeConnectId: true,
        minWithdrawalAmount: true,
      },
    },
    program: {
      select: {
        id: true,
        name: true,
        logo: true,
      },
    },
  });

  const currentInvoicePayouts = await prisma.payout.findMany({
    where: {
      invoiceId,
      status: "processing",
      partner: {
        payoutsEnabledAt: {
          not: null,
        },
        stripeConnectId: {
          not: null,
        },
      },
    },
    include: commonInclude,
  });

  if (currentInvoicePayouts.length === 0) {
    console.log("No payouts to be sent via Stripe, skipping...");
    return;
  }

  // get all previously processed payouts for the partners in this invoice
  // but haven't been transferred to their Stripe Express account yet
  const previouslyProcessedPayouts = await prisma.payout.findMany({
    where: {
      status: "processed",
      stripeTransferId: null,
      partnerId: {
        in: currentInvoicePayouts.map((p) => p.partnerId),
      },
    },
    include: commonInclude,
  });

  // Group currentInvoicePayouts + previouslyProcessedPayouts by partnerId
  const partnerPayoutsMap = [
    ...currentInvoicePayouts,
    ...previouslyProcessedPayouts,
  ].reduce((map, payout) => {
    const { partner } = payout;

    if (!map.has(partner.id)) {
      map.set(partner.id, []);
    }

    map.get(partner.id)!.push(payout);

    return map;
  }, new Map<string, typeof currentInvoicePayouts>());

  // Process payouts for each partner
  for (const [_, partnerPayouts] of partnerPayoutsMap) {
    let withdrawalFee = 0;
    const partner = partnerPayouts[0].partner;

    const partnerPayoutsIds = partnerPayouts.map((p) => p.id);

    // this is usually just one payout, but we're doing this
    // just in case there are multiple payouts for the same partner in the same invoice
    const partnerPayoutsForCurrentInvoice = partnerPayouts.filter(
      (p) => p.invoiceId === invoiceId,
    );

    const totalTransferableAmount = partnerPayouts.reduce(
      (acc, payout) => acc + payout.amount,
      0,
    );

    // If the total transferable amount is less than the partner's minimum withdrawal amount
    // we only update status for all the partner payouts for the current invoice to "processed" – no need to create a transfer for now
    if (totalTransferableAmount < partner.minWithdrawalAmount) {
      await prisma.payout.updateMany({
        where: {
          id: {
            in: partnerPayoutsForCurrentInvoice.map((p) => p.id),
          },
        },
        data: {
          status: "processed",
        },
      });

      console.log(
        `Total processed payouts (${currencyFormatter(totalTransferableAmount / 100)}) for partner ${partner.id} are below the minWithdrawalAmount (${currencyFormatter(partner.minWithdrawalAmount / 100)}), skipping...`,
      );

      continue;
    }

    // Decide if we need to charge a withdrawal fee for the partner
    if (partner.minWithdrawalAmount < MIN_WITHDRAWAL_AMOUNT_CENTS) {
      withdrawalFee = BELOW_MIN_WITHDRAWAL_FEE_CENTS;
    }

    // Minus the withdrawal fee from the total amount
    const finalTransferableAmount = totalTransferableAmount - withdrawalFee;

    if (finalTransferableAmount <= 0) {
      continue;
    }

    // Create a transfer for the partner combined payouts and update it as sent
    const transfer = await stripe.transfers.create(
      {
        amount: finalTransferableAmount,
        currency: "usd",
        // here, `transfer_group` technically only used to associate the transfer with the invoice
        // (even though the transfer could technically include payouts from multiple invoices)
        transfer_group: invoiceId,
        destination: partner.stripeConnectId!,
        description: `Dub Partners payout for ${partnerPayoutsIds.join(", ")}`,
      },
      {
        idempotencyKey: `${invoiceId}-${partner.id}`,
      },
    );

    console.log(
      `Transfer of ${currencyFormatter(finalTransferableAmount / 100)} (${transfer.id}) created for partner ${partner.id} for ${pluralize(
        "payout",
        partnerPayouts.length,
      )} ${partnerPayoutsIds.join(", ")}`,
    );

    await Promise.allSettled([
      prisma.payout.updateMany({
        where: {
          id: {
            in: partnerPayoutsIds,
          },
        },
        data: {
          stripeTransferId: transfer.id,
          status: "sent",
          paidAt: new Date(),
        },
      }),

      prisma.commission.updateMany({
        where: {
          payoutId: {
            in: partnerPayoutsIds,
          },
        },
        data: {
          status: "paid",
        },
      }),

      partner.email
        ? sendEmail({
            variant: "notifications",
            subject: "You've been paid!",
            email: partner.email,
            react: PartnerPayoutProcessed({
              email: partner.email,
              program: partnerPayoutsForCurrentInvoice[0].program,
              payout: partnerPayoutsForCurrentInvoice[0],
              variant: "stripe",
            }),
          })
        : Promise.resolve(),
    ]);

    // sleep for 250ms
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}
