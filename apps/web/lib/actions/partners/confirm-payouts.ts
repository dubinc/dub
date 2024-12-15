"use server";

import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { createId } from "@/lib/api/utils";
import { MIN_PAYOUT_AMOUNT } from "@/lib/partners/constants";
import { stripe } from "@/lib/stripe";
import { prisma } from "@dub/prisma";
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

    if (!workspace.stripeId) {
      throw new Error("Workspace does not have a valid Stripe ID.");
    }

    // Doing some check to make sure the payment method is valid
    const paymentMethod = await stripe.paymentMethods.retrieve(
      paymentMethodId,
      { expand: ["customer"] },
    );

    const stripeCustomer = paymentMethod.customer as Stripe.Customer;

    if (stripeCustomer.id !== workspace.stripeId) {
      throw new Error("The payment method is not valid for this workspace.");
    }

    const payouts = await prisma.payout.findMany({
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
        amount: {
          gte: MIN_PAYOUT_AMOUNT,
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
    const amount = payouts.reduce((total, payout) => total + payout.amount, 0);
    const fee = amount * 0.02;
    const total = amount + fee;

    const invoice = await prisma.invoice.create({
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

    const { id: paymentIntentId } = await stripe.paymentIntents.create({
      amount: invoice.total,
      customer: workspace.stripeId,
      payment_method: invoice.paymentMethodId,
      payment_method_types: ["card", "us_bank_account"],
      currency: "usd",
      confirmation_method: "automatic",
      confirm: true,
      transfer_group: invoice.id,
      statement_descriptor: "Dub Partners",
      description: "Dub Partners payout invoice",
    });

    console.log("Payment intent created", paymentIntentId);

    await Promise.all([
      prisma.payout.updateMany({
        where: {
          id: {
            in: payouts.map((p) => p.id),
          },
        },
        data: {
          invoiceId: invoice.id,
          status: "processing",
        },
      }),
      prisma.invoice.update({
        where: {
          id: invoice.id,
        },
        data: {
          paymentIntentId,
        },
      }),
    ]);

    return {
      invoice,
    };
  });
