"use server";

import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { createId } from "@/lib/api/utils";
import { qstash } from "@/lib/cron";
import { stripe } from "@/lib/stripe";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import Stripe from "stripe";
import z from "zod";
import { authActionClient } from "../safe-action";

// TODO:
// Fix `fee`

const confirmPayoutsSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  paymentMethodId: z.string().min(1, "Please select a payment method."),
});

// Confirm payouts
export const confirmPayoutsAction = authActionClient
  .schema(confirmPayoutsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { programId, paymentMethodId } = parsedInput;

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    // Doing some check to make sure the payment method is valid
    const paymentMethod = await stripe.paymentMethods.retrieve(
      paymentMethodId,
      { expand: ["customer"] },
    );

    const stripeCustomer = paymentMethod.customer as Stripe.Customer;

    if (stripeCustomer.id !== workspace.stripeId) {
      throw new Error("The payment method is not valid for this workspace.");
    }

    const result = await prisma.$transaction(async (tx) => {
      // Find the pending payouts for the program
      const payouts = await tx.payout.findMany({
        where: {
          programId,
          status: "pending",
          invoiceId: null, // just to be extra safe
          partner: {
            stripeConnectId: {
              not: null,
            },
            payoutsEnabled: true,
          },
        },
        select: {
          id: true,
          amount: true,
        },
      });

      if (!payouts.length) {
        throw new Error("No pending payouts found.");
      }

      // Create the invoice for the payouts
      const amount = payouts.reduce(
        (total, payout) => total + payout.amount,
        0,
      );
      const fee = amount * 0.02;
      const total = amount + fee;

      const invoice = await tx.invoice.create({
        data: {
          id: createId({ prefix: "inv_" }),
          programId,
          paymentMethodId,
          amount,
          fee,
          total,
        },
      });

      if (!invoice) {
        throw new Error("Failed to create payout invoice.");
      }

      // Update the payouts with the invoice id
      await tx.payout.updateMany({
        where: {
          id: {
            in: payouts.map((p) => p.id),
          },
        },
        data: {
          invoiceId: invoice.id,
        },
      });

      return invoice;
    });

    // Process the payouts in the background
    waitUntil(
      qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/invoices`,
        body: {
          invoiceId: result.id,
        },
      }),
    );

    return {
      invoice: result,
    };
  });
