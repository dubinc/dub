import { createId } from "@/lib/api/create-id";
import {
  DIRECT_DEBIT_PAYMENT_METHOD_TYPES,
  FOREX_MARKUP_PERCENTAGE,
} from "@/lib/partners/constants";
import {
  CUTOFF_PERIOD,
  CUTOFF_PERIOD_TYPES,
} from "@/lib/partners/cutoff-period";
import { calculatePayoutFeeForMethod } from "@/lib/payment-methods";
import { stripe } from "@/lib/stripe";
import { createFxQuote } from "@/lib/stripe/create-fx-quote";
import { resend } from "@dub/email/resend";
import { VARIANT_TO_FROM_MAP } from "@dub/email/resend/constants";
import PartnerPayoutConfirmed from "@dub/email/templates/partner-payout-confirmed";
import { prisma } from "@dub/prisma";
import { chunk, log } from "@dub/utils";
import { Program, Project } from "@prisma/client";

const paymentMethodToCurrency = {
  sepa_debit: "eur",
  acss_debit: "cad",
} as const;

export async function confirmPayouts({
  workspace,
  program,
  userId,
  paymentMethodId,
  cutoffPeriod,
}: {
  workspace: Pick<
    Project,
    "id" | "stripeId" | "plan" | "invoicePrefix" | "payoutFee"
  >;
  program: Pick<Program, "id" | "name" | "logo" | "minPayoutAmount">;
  userId: string;
  paymentMethodId: string;
  cutoffPeriod?: CUTOFF_PERIOD_TYPES;
}) {
  const cutoffPeriodValue = CUTOFF_PERIOD.find(
    (c) => c.id === cutoffPeriod,
  )?.value;

  const payouts = await prisma.payout.findMany({
    where: {
      programId: program.id,
      status: "pending",
      invoiceId: null,
      amount: {
        gte: program.minPayoutAmount,
      },
      partner: {
        payoutsEnabledAt: {
          not: null,
        },
      },
      ...(cutoffPeriodValue && {
        OR: [
          {
            periodStart: null,
            periodEnd: null,
          },
          {
            periodEnd: {
              lte: cutoffPeriodValue,
            },
          },
        ],
      }),
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
    },
  });

  if (payouts.length === 0) {
    return;
  }

  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

  // Create the invoice for the payouts
  const newInvoice = await prisma.$transaction(async (tx) => {
    const amount = payouts.reduce((total, payout) => total + payout.amount, 0);

    const payoutFee = calculatePayoutFeeForMethod({
      paymentMethod: paymentMethod.type,
      payoutFee: workspace.payoutFee,
    });

    if (!payoutFee) {
      throw new Error("Failed to calculate payout fee.");
    }

    console.info(
      `Using payout fee of ${payoutFee} for payment method ${paymentMethod.type}`,
    );

    const currency = paymentMethodToCurrency[paymentMethod.type] || "usd";
    const totalFee = amount * payoutFee;
    const total = amount + totalFee;
    let convertedTotal = total;

    // convert the amount to EUR/CAD if the payment method is sepa_debit or acss_debit
    if (["sepa_debit", "acss_debit"].includes(paymentMethod.type)) {
      const fxQuote = await createFxQuote({
        fromCurrency: "usd",
        toCurrency: currency,
      });

      const exchangeRate = fxQuote.rates["usd"].exchange_rate;

      if (!exchangeRate || exchangeRate <= 0) {
        throw new Error(
          `Failed to get exchange rate from Stripe for ${currency}.`,
        );
      }

      convertedTotal = Math.round(
        total * exchangeRate * (1 + FOREX_MARKUP_PERCENTAGE / 100),
      );

      console.log(
        `Currency conversion: ${total} usd -> ${convertedTotal} ${currency} using exchange rate ${exchangeRate}.`,
      );
    }

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
        programId: program.id,
        workspaceId: workspace.id,
        amount,
        fee: totalFee,
        total,
      },
    });

    if (!invoice) {
      throw new Error("Failed to create payout invoice.");
    }

    await stripe.paymentIntents.create({
      amount: convertedTotal,
      customer: workspace.stripeId!,
      payment_method: paymentMethod.id,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
      currency,
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
        userId,
      },
    });

    await tx.project.update({
      where: {
        id: workspace.id,
      },
      data: {
        payoutsUsage: {
          increment: amount,
        },
      },
    });

    return invoice;
  });

  // Send emails to all the partners involved in the payouts if the payout method is Direct Debit
  // This is because Direct Debit takes 4 business days to process, so we want to give partners a heads up
  if (
    newInvoice &&
    DIRECT_DEBIT_PAYMENT_METHOD_TYPES.includes(paymentMethod.type)
  ) {
    if (!resend) {
      // this should never happen, but just in case
      await log({
        message: "Resend is not configured, skipping email sending.",
        type: "errors",
      });
      console.log("Resend is not configured, skipping email sending.");
      return;
    }

    const payoutChunks = chunk(
      payouts.filter((payout) => payout.partner.email),
      100,
    );

    for (const payoutChunk of payoutChunks) {
      await resend.batch.send(
        payoutChunk.map((payout) => ({
          from: VARIANT_TO_FROM_MAP.notifications,
          to: payout.partner.email!,
          subject: "You've got money coming your way!",
          react: PartnerPayoutConfirmed({
            email: payout.partner.email!,
            program,
            payout: {
              id: payout.id,
              amount: payout.amount,
              startDate: payout.periodStart,
              endDate: payout.periodEnd,
            },
          }),
        })),
      );
    }
  }
}
