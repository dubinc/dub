import { getPayoutEligibilityFilter } from "@/lib/api/payouts/payout-eligibility-filter";
import { FAST_ACH_FEE_CENTS, FOREX_MARKUP_RATE } from "@/lib/constants/payouts";
import { qstash } from "@/lib/cron";
import {
  CUTOFF_PERIOD,
  CUTOFF_PERIOD_TYPES,
} from "@/lib/partners/cutoff-period";
import { stripe } from "@/lib/stripe";
import { createFxQuote } from "@/lib/stripe/create-fx-quote";
import { calculatePayoutFeeForMethod } from "@/lib/stripe/payment-methods";
import { prisma } from "@dub/prisma";
import {
  Partner,
  Payout,
  Program,
  ProgramPayoutMode,
  Project,
} from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, currencyFormatter, log } from "@dub/utils";

const paymentMethodToCurrency = {
  sepa_debit: "eur",
  acss_debit: "cad",
} as const;

interface ProcessPayoutsProps {
  workspace: Pick<
    Project,
    | "id"
    | "stripeId"
    | "plan"
    | "invoicePrefix"
    | "payoutsUsage"
    | "payoutsLimit"
    | "payoutFee"
    | "webhookEnabled"
  >;
  program: Pick<
    Program,
    "id" | "name" | "logo" | "minPayoutAmount" | "supportEmail"
  > & {
    payoutMode: ProgramPayoutMode;
  };
  userId: string;
  invoiceId: string;
  paymentMethodId: string;
  cutoffPeriod?: CUTOFF_PERIOD_TYPES;
  selectedPayoutId?: string;
  excludedPayoutIds?: string[];
}

interface ExtendedPayout
  extends Pick<Payout, "id" | "amount" | "mode" | "periodStart" | "periodEnd"> {
  partner: Pick<Partner, "email" | "payoutsEnabledAt">;
}

export async function processPayouts({
  workspace,
  program,
  userId,
  invoiceId,
  paymentMethodId,
  cutoffPeriod,
  selectedPayoutId,
  excludedPayoutIds,
}: ProcessPayoutsProps) {
  const cutoffPeriodValue = CUTOFF_PERIOD.find(
    (c) => c.id === cutoffPeriod,
  )?.value;

  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: {
      id: invoiceId,
    },
  });

  const res = await prisma.payout.updateMany({
    where: {
      ...(selectedPayoutId
        ? { id: selectedPayoutId }
        : excludedPayoutIds && excludedPayoutIds.length > 0
          ? { id: { notIn: excludedPayoutIds } }
          : {}),
      ...getPayoutEligibilityFilter(program),
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
    data: {
      invoiceId,
      status: "processing",
      userId,
      initiatedAt: new Date(),
      // if the program is in external mode, set the mode to external
      // otherwise set it to internal (we'll update to "external" later if it's hybrid mode)
      mode: program.payoutMode === "external" ? "external" : "internal",
    },
  });

  if (res.count === 0) {
    console.log(`No payouts found for invoice ${invoiceId}. Skipping...`);
    return;
  }

  console.log(
    `Updated ${res.count} payouts to invoice ${invoiceId} and "processing" status`,
  );

  //
  if (program.payoutMode === "hybrid") {
    await prisma.payout.updateMany({
      where: {
        invoiceId,
        partner: {
          payoutsEnabledAt: null,
        },
      },
      data: {
        mode: "external",
      },
    });
  }

  const payoutsByMode = await prisma.payout.groupBy({
    by: ["mode"],
    where: {
      invoiceId,
    },
    _sum: {
      amount: true,
    },
  });

  const totalInternalPayoutAmount =
    payoutsByMode.find((p) => p.mode === "internal")?._sum.amount ?? 0;
  const totalExternalPayoutAmount =
    payoutsByMode.find((p) => p.mode === "external")?._sum.amount ?? 0;
  const totalPayoutAmount =
    totalInternalPayoutAmount + totalExternalPayoutAmount;

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

  const fastAchFee =
    invoice.paymentMethod === "ach_fast" ? FAST_ACH_FEE_CENTS : 0;
  const currency = paymentMethodToCurrency[paymentMethod.type] || "usd";
  const invoiceFee = Math.round(totalPayoutAmount * payoutFee) + fastAchFee;
  const invoiceTotal = totalPayoutAmount + invoiceFee;

  await prisma.invoice.update({
    where: {
      id: invoiceId,
    },
    data: {
      amount: totalPayoutAmount,
      externalAmount: totalExternalPayoutAmount,
      fee: invoiceFee,
      total: invoiceTotal,
    },
  });

  let totalToCharge = invoiceTotal - totalExternalPayoutAmount;

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

    const convertedTotal = Math.round(
      (totalToCharge / exchangeRate) * (1 + FOREX_MARKUP_RATE),
    );

    console.log(
      `Currency conversion: ${totalToCharge} usd -> ${convertedTotal} ${currency} using exchange rate ${exchangeRate}.`,
    );

    totalToCharge = convertedTotal;
  }

  await stripe.paymentIntents.create(
    {
      amount: totalToCharge,
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
    },
    {
      idempotencyKey: `process-payout-invoice/${invoice.id}`,
    },
  );

  await prisma.project.update({
    where: {
      id: workspace.id,
    },
    data: {
      payoutsUsage: {
        increment: totalPayoutAmount,
      },
    },
  });

  await log({
    message: `*${program.name}* just sent a payout of *${currencyFormatter(totalPayoutAmount)}* :money_with_wings: \n\n Fees earned: *${currencyFormatter(invoiceFee)} (${payoutFee * 100}%)* :money_mouth_face:`,
    type: "payouts",
  });

  const qstashResponse = await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/process/updates`,
    body: {
      invoiceId,
    },
  });

  if (qstashResponse.messageId) {
    console.log(`Message sent to Qstash with id ${qstashResponse.messageId}`);
  } else {
    console.error("Error sending message to Qstash", qstashResponse);
  }
}
