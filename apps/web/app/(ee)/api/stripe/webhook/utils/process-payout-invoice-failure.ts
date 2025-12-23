import {
  DIRECT_DEBIT_PAYMENT_METHOD_TYPES,
  PAYOUT_FAILURE_FEE_CENTS,
} from "@/lib/constants/payouts";
import { createPaymentIntent } from "@/lib/stripe/create-payment-intent";
import { sendBatchEmail } from "@dub/email";
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
  charge?: Stripe.Charge;
}) {
  await log({
    message: `Partner payout failed for invoice ${invoice.id}.`,
    type: "errors",
    mention: true,
  });

  // reset the payouts to their initial state
  const { count } = await prisma.payout.updateMany({
    where: {
      invoiceId: invoice.id,
    },
    data: {
      status: "pending",
      userId: null,
      invoiceId: null,
      initiatedAt: null,
      paidAt: null,
      mode: null,
    },
  });

  console.log(
    `Reset ${count} payouts to their initial state for invoice ${invoice.id}`,
  );

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

  const paymentMethod =
    charge &&
    charge.payment_method_details &&
    DIRECT_DEBIT_PAYMENT_METHOD_TYPES.includes(
      charge.payment_method_details.type as Stripe.PaymentMethod.Type,
    )
      ? "direct_debit"
      : "card";

  let chargedFailureFee = false;
  let cardLast4: string | undefined;

  // Charge failure fee for direct debit payment failures (excluding blocked charges)
  if (paymentMethod === "direct_debit") {
    const isBlocked = charge?.outcome?.type === "blocked";

    if (!isBlocked) {
      const { paymentIntent, paymentMethod } = await createPaymentIntent({
        stripeId: workspace.stripeId,
        amount: PAYOUT_FAILURE_FEE_CENTS,
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
    } else {
      console.log(
        `Skipped charging failure fee for blocked direct debit charge on invoice ${invoice.id}.`,
      );
    }
  }

  waitUntil(
    (async () => {
      // Send email to the workspace users about the failed payout
      const emailData = workspace.users
        .filter((user) => user.user.email)
        .map((user) => ({
          email: user.user.email!,
          workspace: {
            slug: workspace.slug,
          },
          program: {
            name: workspace.programs[0].name,
          },
          payout: {
            amount: invoice.total,
            method: paymentMethod as "card" | "direct_debit",
            failedReason: invoice.failedReason,
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

      await sendBatchEmail(
        emailData.map((data) => ({
          variant: "notifications",
          subject: "Partner payout failed",
          to: data.email,
          react: PartnerPayoutFailed(data),
        })),
      );
    })(),
  );
}
