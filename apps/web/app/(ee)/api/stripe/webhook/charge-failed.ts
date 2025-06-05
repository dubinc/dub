import { PAYOUT_FAILURE_FEE_CENTS } from "@/lib/partners/constants";
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

  log({
    message: `Partner payout failed for invoice ${invoiceId}.`,
    type: "errors",
    mention: true,
  });

  if (!invoiceId) {
    console.log("No transfer group found, skipping...");
    return;
  }

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

  const workspace = await prisma.project.findUniqueOrThrow({
    where: {
      id: invoice.workspaceId,
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

  const paymentMethods = await stripe.paymentMethods.list({
    customer: workspace.stripeId,
    type: "card",
  });

  if (paymentMethods.data.length === 0) {
    console.log("No valid payment methods found for workspace, skipping...");
    return;
  }

  const paymentMethod = paymentMethods.data[0];
  const shouldChargeFailureFee =
    charge.payment_method_details?.type === "us_bank_account";

  // Charge failure fee for ACH payment failures
  if (shouldChargeFailureFee) {
    await stripe.paymentIntents.create({
      amount: PAYOUT_FAILURE_FEE_CENTS,
      customer: workspace.stripeId,
      payment_method_types: ["card"],
      payment_method: paymentMethod.id,
      currency: "usd",
      confirmation_method: "automatic",
      confirm: true,
      statement_descriptor: "Dub Partners",
      description: `Dub Partners payout failure fee for invoice ${invoice.id}`,
    });

    console.log(
      `Charged a failure fee of $${PAYOUT_FAILURE_FEE_CENTS / 100} to ${workspace.slug}.`,
    );
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
          ...(shouldChargeFailureFee && {
            failureFee: PAYOUT_FAILURE_FEE_CENTS,
            cardLast4: paymentMethod.card?.last4 || "",
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
