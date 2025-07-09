import {
  DIRECT_DEBIT_PAYMENT_METHOD_TYPES,
  PAYOUT_FAILURE_FEE_CENTS,
} from "@/lib/partners/constants";
import { stripe } from "@/lib/stripe";
import { sendEmail } from "@dub/email";
import PartnerPayoutFailed from "@dub/email/templates/partner-payout-failed";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import Stripe from "stripe";

export async function chargeFailed(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;

  const {
    amount,
    transfer_group: invoiceId,
    failure_message: failedReason,
  } = charge;

  if (!invoiceId) {
    console.log("No transfer group found, skipping...");
    return;
  }

  await log({
    message: `Partner payout failed for invoice ${invoiceId}.`,
    type: "errors",
    mention: true,
  });

  // Mark the invoice as failed
  const invoice = await prisma.invoice.update({
    where: {
      id: invoiceId,
    },
    data: {
      status: "failed",
      failedReason,
    },
  });

  // Mark the payouts as pending again
  await prisma.payout.updateMany({
    where: {
      invoiceId,
    },
    data: {
      status: "pending",
      userId: null,
      invoiceId: null,
    },
  });

  const workspace = await prisma.project.update({
    where: {
      id: invoice.workspaceId,
    },
    // Reduce the payoutsUsage by the invoice amount since the charge failed
    data: {
      payoutsUsage: {
        decrement: invoice.amount,
      },
    },
    include: {
      users: {
        select: {
          user: {
            select: {
              email: true,
            },
          },
        },
      },
      programs: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!workspace.stripeId) {
    console.log("Workspace does not have a Stripe ID, skipping...");
    return;
  }

  let cardLast4: string | undefined;
  let chargedFailureFee = false;

  // Charge failure fee for direct debit payment failures
  if (
    charge.payment_method_details &&
    DIRECT_DEBIT_PAYMENT_METHOD_TYPES.includes(
      charge.payment_method_details.type as Stripe.PaymentMethod.Type,
    )
  ) {
    const [cards, links] = await Promise.all([
      stripe.paymentMethods.list({
        customer: workspace.stripeId,
        type: "card",
      }),
      stripe.paymentMethods.list({
        customer: workspace.stripeId,
        type: "link",
      }),
    ]);

    if (cards.data.length === 0 && links.data.length === 0) {
      console.log("No valid payment methods found for workspace, skipping...");
      return;
    }

    const paymentMethod = cards.data[0] || links.data[0];

    if (paymentMethod) {
      cardLast4 = paymentMethod.card?.last4;

      await stripe.paymentIntents.create({
        amount: PAYOUT_FAILURE_FEE_CENTS,
        customer: workspace.stripeId,
        payment_method_types: ["card", "link"],
        payment_method: paymentMethod.id,
        currency: "usd",
        confirmation_method: "automatic",
        confirm: true,
        statement_descriptor: "Dub Partners",
        description: `Dub Partners payout failure fee for invoice ${invoice.id}`,
      });

      chargedFailureFee = true;

      console.log(
        `Charged a failure fee of $${PAYOUT_FAILURE_FEE_CENTS / 100} to ${workspace.slug}.`,
      );
    }
  }

  waitUntil(
    (async () => {
      // Send email to the workspace users about the failed payout
      const emailData = workspace.users.map((user) => ({
        email: user.user.email!,
        workspace: {
          slug: workspace.slug,
        },
        program: {
          name: workspace.programs[0].name,
        },
        payout: {
          amount,
          ...(chargedFailureFee && {
            failureFee: PAYOUT_FAILURE_FEE_CENTS,
            cardLast4,
          }),
        },
      }));

      if (emailData.length === 0) {
        console.log("No users found to send email, skipping...");
        return;
      }

      await Promise.all(
        emailData.map((data) => {
          sendEmail({
            subject: "Partner payout failed",
            email: data.email,
            react: PartnerPayoutFailed(data),
            variant: "notifications",
          });
        }),
      );
    })(),
  );
}
