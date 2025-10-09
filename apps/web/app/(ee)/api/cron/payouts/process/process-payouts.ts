import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { exceededLimitError } from "@/lib/api/errors";
import {
  DIRECT_DEBIT_PAYMENT_METHOD_TYPES,
  FAST_ACH_FEE_CENTS,
  FOREX_MARKUP_RATE,
} from "@/lib/partners/constants";
import {
  CUTOFF_PERIOD,
  CUTOFF_PERIOD_TYPES,
} from "@/lib/partners/cutoff-period";
import { stripe } from "@/lib/stripe";
import { createFxQuote } from "@/lib/stripe/create-fx-quote";
import { calculatePayoutFeeForMethod } from "@/lib/stripe/payment-methods";
import { PlanProps } from "@/lib/types";
import { sendBatchEmail } from "@dub/email";
import { resend } from "@dub/email/resend";
import PartnerPayoutConfirmed from "@dub/email/templates/partner-payout-confirmed";
import { prisma } from "@dub/prisma";
import { chunk, currencyFormatter, log } from "@dub/utils";
import { Program, Project } from "@prisma/client";
import { waitUntil } from "@vercel/functions";

const paymentMethodToCurrency = {
  sepa_debit: "eur",
  acss_debit: "cad",
} as const;

export async function processPayouts({
  workspace,
  program,
  userId,
  invoiceId,
  paymentMethodId,
  cutoffPeriod,
  selectedPayoutId,
  excludedPayoutIds,
}: {
  workspace: Pick<
    Project,
    | "id"
    | "stripeId"
    | "plan"
    | "invoicePrefix"
    | "payoutsUsage"
    | "payoutsLimit"
    | "payoutFee"
  >;
  program: Pick<Program, "id" | "name" | "logo" | "minPayoutAmount">;
  userId: string;
  invoiceId: string;
  paymentMethodId: string;
  cutoffPeriod?: CUTOFF_PERIOD_TYPES;
  selectedPayoutId?: string;
  excludedPayoutIds?: string[];
}) {
  const cutoffPeriodValue = CUTOFF_PERIOD.find(
    (c) => c.id === cutoffPeriod,
  )?.value;

  const payouts = await prisma.payout.findMany({
    where: {
      ...(selectedPayoutId
        ? { id: selectedPayoutId }
        : excludedPayoutIds
          ? { id: { notIn: excludedPayoutIds } }
          : {}),
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

  const payoutAmount = payouts.reduce(
    (total, payout) => total + payout.amount,
    0,
  );

  if (workspace.payoutsUsage + payoutAmount > workspace.payoutsLimit) {
    throw new Error(
      exceededLimitError({
        plan: workspace.plan as PlanProps,
        limit: workspace.payoutsLimit,
        type: "payouts",
      }),
    );
  }

  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

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

  let invoice = await prisma.invoice.findUniqueOrThrow({
    where: {
      id: invoiceId,
    },
  });

  const fastAchFee =
    invoice.paymentMethod === "ach_fast" ? FAST_ACH_FEE_CENTS : 0;
  const currency = paymentMethodToCurrency[paymentMethod.type] || "usd";
  const totalFee = Math.round(payoutAmount * payoutFee) + fastAchFee;
  const total = payoutAmount + totalFee;
  let convertedTotal = total;

  // convert the amount to EUR/CAD if the payment method is sepa_debit or acss_debit
  if (["sepa_debit", "acss_debit"].includes(paymentMethod.type)) {
    const fxQuote = await createFxQuote({
      fromCurrency: currency,
      toCurrency: "usd",
    });

    const exchangeRate = fxQuote.rates[currency].exchange_rate;

    // if Stripe's FX rate is not available, throw an error
    if (!exchangeRate || exchangeRate <= 0) {
      throw new Error(
        `Failed to get exchange rate from Stripe for ${currency}.`,
      );
    }

    convertedTotal = Math.round(
      (total / exchangeRate) * (1 + FOREX_MARKUP_RATE),
    );

    console.log(
      `Currency conversion: ${total} usd -> ${convertedTotal} ${currency} using exchange rate ${exchangeRate}.`,
    );
  }

  // Update the invoice with the finalized payout amount, fee, and total
  invoice = await prisma.invoice.update({
    where: {
      id: invoiceId,
    },
    data: {
      amount: payoutAmount,
      fee: totalFee,
      total,
    },
  });

  await stripe.paymentIntents.create({
    amount: convertedTotal,
    customer: workspace.stripeId!,
    payment_method_types: [paymentMethod.type],
    payment_method: paymentMethod.id,
    ...(paymentMethod.type === "us_bank_account" && {
      payment_method_options: {
        us_bank_account: {
          preferred_settlement_speed:
            invoice.paymentMethod === "ach_fast" ? "fastest" : "standard",
        },
      },
    }),
    currency,
    confirmation_method: "automatic",
    confirm: true,
    transfer_group: invoice.id,
    statement_descriptor: "Dub Partners",
    description: `Dub Partners payout invoice (${invoice.id})`,
  });

  await prisma.payout.updateMany({
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

  await prisma.project.update({
    where: {
      id: workspace.id,
    },
    data: {
      payoutsUsage: {
        increment: payoutAmount,
      },
    },
  });

  await log({
    message: `*${program.name}* just sent a payout of *${currencyFormatter(payoutAmount / 100)}* :money_with_wings: \n\n Fees earned: *${currencyFormatter(totalFee / 100)} (${payoutFee * 100}%)* :money_mouth_face:`,
    type: "payouts",
  });

  // Send emails to all the partners involved in the payouts if the payout method is Direct Debit
  // This is because Direct Debit takes 4 business days to process, so we want to give partners a heads up
  if (
    invoice &&
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
      await sendBatchEmail(
        payoutChunk.map((payout) => ({
          variant: "notifications",
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
              paymentMethod: invoice.paymentMethod ?? "ach",
            },
          }),
        })),
      );
    }
  }

  waitUntil(
    (async () => {
      // refetching to confirm the payouts are in the processing state
      const updatedPayouts = await prisma.payout.findMany({
        where: {
          id: {
            in: payouts.map((p) => p.id),
          },
          status: "processing",
        },
        select: {
          id: true,
          status: true,
          user: true,
        },
      });

      await recordAuditLog(
        updatedPayouts.map((payout) => ({
          workspaceId: workspace.id,
          programId: program.id,
          action: "payout.confirmed",
          description: `Payout ${payout.id} confirmed`,
          actor: payout.user!,
          targets: [
            {
              type: "payout",
              id: payout.id,
              metadata: payout,
            },
          ],
        })),
      );
    })(),
  );
}
