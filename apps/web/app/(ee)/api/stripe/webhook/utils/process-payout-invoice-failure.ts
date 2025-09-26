import {
  DIRECT_DEBIT_PAYMENT_METHOD_TYPES,
  PAYOUT_FAILURE_FEE_CENTS,
} from "@/lib/partners/constants";
import { createPaymentIntent } from "@/lib/stripe/create-payment-intent";
import { sendEmail } from "@dub/email";
import PartnerPayoutFailed from "@dub/email/templates/partner-payout-failed";
import { prisma } from "@dub/prisma";
import { Invoice } from "@dub/prisma/client";
import { log } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import Stripe from "stripe";

export async function processPayoutInvoiceFailure({
  invoice,
  charge,
}: {
  invoice: Invoice;
  charge: Stripe.Charge;
}) {
  await log({
    message: `Partner payout failed for invoice ${invoice.id}.`,
    type: "errors",
    mention: true,
  });

  // Mark the payouts as pending again
  await prisma.payout.updateMany({
    where: {
      invoiceId: invoice.id,
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
    const { paymentIntent, paymentMethod } = await createPaymentIntent({
      stripeId: workspace.stripeId,
      amount: PAYOUT_FAILURE_FEE_CENTS,
      invoiceId: invoice.id,
      description: `Dub Partners payout failure fee for invoice ${invoice.id}`,
      statementDescriptor: "Dub Partners",
    });

    if (paymentIntent) {
      chargedFailureFee = true;
      console.log(
        `Charged a failure fee of $${PAYOUT_FAILURE_FEE_CENTS / 100} to ${workspace.slug}.`,
      );
    }

    if (paymentMethod?.card) {
      cardLast4 = paymentMethod.card.last4;
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
          amount: charge.amount,
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
            to: data.email,
            react: PartnerPayoutFailed(data),
            variant: "notifications",
          });
        }),
      );
    })(),
  );
}
