"use server";

import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { createId } from "@/lib/api/utils";
import { qstash } from "@/lib/cron";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import z from "zod";
import { authActionClient } from "../safe-action";

// TODO:
// Fix `paymentMethodId`
// Fix `fee`

const confirmPayoutsSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
});

// Confirm payouts
export const confirmPayoutsAction = authActionClient
  .schema(confirmPayoutsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { programId } = parsedInput;

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const result = await prisma.$transaction(async (tx) => {
      // Find the pending payouts for the program
      const payouts = await tx.payout.findMany({
        where: {
          programId,
          status: "pending",
          invoiceId: null, // just to be extra safe
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
          paymentMethodId: "xxx",
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
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/process-payouts`,
        body: {
          invoiceId: result.id,
        },
      }),
    );

    return {
      invoice: result,
    };
  });
