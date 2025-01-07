"use server";

import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { createId } from "@/lib/api/utils";
import {
  DUB_PARTNERS_PAYOUT_FEE_ACH,
  DUB_PARTNERS_PAYOUT_FEE_CARD,
  MIN_PAYOUT_AMOUNT,
} from "@/lib/partners/constants";
import { stripe } from "@/lib/stripe";
import { prisma } from "@dub/prisma";
import z from "zod";
import { authActionClient } from "../safe-action";

const confirmPayoutsSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  payoutMethodId: z.string(),
  payoutIds: z.array(z.string()).min(1),
});

// Confirm payouts
export const confirmPayoutsAction = authActionClient
  .schema(confirmPayoutsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { programId, payoutMethodId, payoutIds } = parsedInput;

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    if (!workspace.stripeId) {
      throw new Error("Workspace does not have a valid Stripe ID.");
    }

    // Check the payout method is valid
    const payoutMethod = await stripe.paymentMethods.retrieve(payoutMethodId);

    if (payoutMethod.customer !== workspace.stripeId) {
      throw new Error("Invalid payout method.");
    }

    if (!["card", "us_bank_account"].includes(payoutMethod.type)) {
      throw new Error(
        `We only support card and ACH for now. Please update your payout method to one of these.`,
      );
    }

    const payouts = await prisma.payout.findMany({
      where: {
        programId,
        status: "pending",
        invoiceId: null, // just to be extra safe
        id: {
          in: payoutIds,
        },
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
    return await prisma.$transaction(async (tx) => {
      const amount = payouts.reduce(
        (total, payout) => total + payout.amount,
        0,
      );

      const fee =
        payoutMethod.type === "card"
          ? amount * DUB_PARTNERS_PAYOUT_FEE_CARD
          : amount * DUB_PARTNERS_PAYOUT_FEE_ACH;

      const total = amount + fee;

      const invoice = await tx.invoice.create({
        data: {
          id: createId({ prefix: "inv_" }),
          programId,
          workspaceId: workspace.id,
          amount,
          fee,
          total,
        },
      });

      if (!invoice) {
        throw new Error("Failed to create payout invoice.");
      }

      await stripe.paymentIntents.create({
        amount: invoice.total,
        customer: workspace.stripeId!,
        payment_method_types: ["us_bank_account"],
        payment_method: workspace.payoutMethodId!,
        currency: "usd",
        confirmation_method: "automatic",
        confirm: true,
        transfer_group: invoice.id,
        statement_descriptor: "Dub Partners",
        description: `Dub Partners payout invoice (${invoice.id})`,
      });

      await tx.payout.updateMany({
        where: {
          id: {
            in: payouts.map((p) => p.id),
          },
        },
        data: {
          invoiceId: invoice.id,
          status: "processing",
        },
      });

      return {
        invoice,
      };
    });
  });
