"use server";

import { createId } from "@/lib/api/create-id";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { PAYOUT_FEES } from "@/lib/partners/constants";
import { stripe } from "@/lib/stripe";
import { sendEmail } from "@dub/email";
import { PartnerPayoutConfirmed } from "@dub/email/templates/partner-payout-confirmed";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import z from "zod";
import { authActionClient } from "../safe-action";

const confirmPayoutsSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  paymentMethodId: z.string(),
  payoutIds: z.array(z.string()).min(1),
});

const allowedPaymentMethods = ["us_bank_account", "card", "link"];

// Confirm payouts
export const confirmPayoutsAction = authActionClient
  .schema(confirmPayoutsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { programId, paymentMethodId, payoutIds } = parsedInput;

    const { minPayoutAmount } = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    if (!workspace.stripeId) {
      throw new Error("Workspace does not have a valid Stripe ID.");
    }

    // Check the payout method is valid
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    if (paymentMethod.customer !== workspace.stripeId) {
      throw new Error("Invalid payout method.");
    }

    if (!allowedPaymentMethods.includes(paymentMethod.type)) {
      throw new Error(
        `We only support ACH and Card for now. Please update your payout method to one of these.`,
      );
    }

    const payouts = await prisma.payout.findMany({
      where: {
        programId,
        id: {
          in: payoutIds,
        },
        status: "pending",
        invoiceId: null, // just to be extra safe
        partner: {
          stripeConnectId: {
            not: null,
          },
          payoutsEnabledAt: {
            not: null,
          },
        },
        amount: {
          gte: minPayoutAmount,
        },
      },
      select: {
        id: true,
        amount: true,
        periodStart: true,
        periodEnd: true,
        partner: {
          select: {
            email: true,
          },
        },
        program: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
    });

    if (!payouts.length) {
      throw new Error("No pending payouts found.");
    }

    // Create the invoice for the payouts
    const newInvoice = await prisma.$transaction(async (tx) => {
      const amount = payouts.reduce(
        (total, payout) => total + payout.amount,
        0,
      );

      const fee =
        amount *
        PAYOUT_FEES[workspace.plan?.split(" ")[0] ?? "business"][
          paymentMethod.type === "us_bank_account" ? "ach" : "card"
        ];

      const total = amount + fee;

      // Generate the next invoice number
      const totalInvoices = await tx.invoice.count({
        where: {
          workspaceId: workspace.id,
        },
      });
      const paddedNumber = String(totalInvoices + 1).padStart(4, "0");
      const invoiceNumber = `${workspace.invoicePrefix}-${paddedNumber}`;

      const invoice = await tx.invoice.create({
        data: {
          id: createId({ prefix: "inv_" }),
          number: invoiceNumber,
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
        payment_method_types: allowedPaymentMethods,
        payment_method: paymentMethod.id,
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

      return invoice;
    });

    waitUntil(
      (async () => {
        // Send emails to all the partners involved in the payouts if the payout method is ACH
        // ACH takes 4 business days to process
        if (newInvoice && paymentMethod.type === "us_bank_account") {
          await Promise.all(
            payouts
              .filter((payout) => payout.partner.email)
              .map((payout) =>
                sendEmail({
                  subject: "You've got money coming your way!",
                  email: payout.partner.email!,
                  from: "Dub Partners <system@dub.co>",
                  react: PartnerPayoutConfirmed({
                    email: payout.partner.email!,
                    program: payout.program,
                    payout: {
                      id: payout.id,
                      amount: payout.amount,
                      startDate: payout.periodStart!,
                      endDate: payout.periodEnd!,
                    },
                  }),
                }),
              ),
          );
        }
      })(),
    );
  });
