import { getPayoutEligibilityFilter } from "@/lib/api/payouts/payout-eligibility-filter";
import { FAST_ACH_FEE_CENTS, FOREX_MARKUP_RATE } from "@/lib/constants/payouts";
import { qstash } from "@/lib/cron";
import { queueBatchEmail } from "@/lib/email/queue-batch-email";
import {
  CUTOFF_PERIOD,
  CUTOFF_PERIOD_TYPES,
} from "@/lib/partners/cutoff-period";
import { stripe } from "@/lib/stripe";
import { createFxQuote } from "@/lib/stripe/create-fx-quote";
import { calculatePayoutFeeForMethod } from "@/lib/stripe/payment-methods";
import ProgramPayoutThankYou from "@dub/email/templates/program-payout-thank-you";
import { prisma } from "@dub/prisma";
import { Program, ProgramPayoutMode, Project } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, currencyFormatter, log } from "@dub/utils";

const nonUsdPaymentMethodTypes = {
  sepa_debit: "eur",
  acss_debit: "cad",
} as const;

interface ProcessPayoutsProps {
  workspace: Pick<
    Project,
    | "id"
    | "slug"
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
      invoiceId: invoice.id,
      status: "processing",
      userId,
      initiatedAt: new Date(),
      // if the program is in external mode, set the mode to external
      // otherwise set it to internal (we'll update specific payouts to "external" later if it's hybrid mode)
      mode: program.payoutMode === "external" ? "external" : "internal",
    },
  });

  if (res.count === 0) {
    console.log(
      `No payouts updated/found for invoice ${invoice.id}. Skipping...`,
    );
    return;
  }

  console.log(
    `Updated ${res.count} payouts to invoice ${invoice.id} and "processing" status`,
  );

  // if hybrid mode, we need to update payouts for partners with payoutsEnabledAt = null to external mode
  // here we don't need to filter if they have tenantId cause getPayoutEligibilityFilter above already takes care of that
  if (program.payoutMode === "hybrid") {
    await prisma.payout.updateMany({
      where: {
        invoiceId: invoice.id,
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
      invoiceId: invoice.id,
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
  const invoiceFee = Math.round(totalPayoutAmount * payoutFee) + fastAchFee;
  const invoiceTotal = totalPayoutAmount + invoiceFee;

  console.log({
    totalInternalPayoutAmount,
    totalExternalPayoutAmount,
    totalPayoutAmount,
    invoiceFee,
    invoiceTotal,
  });

  await prisma.invoice.update({
    where: {
      id: invoice.id,
    },
    data: {
      amount: totalPayoutAmount,
      externalAmount: totalExternalPayoutAmount,
      fee: invoiceFee,
      total: invoiceTotal,
    },
  });

  let totalToCharge = invoiceTotal - totalExternalPayoutAmount;
  const currency = nonUsdPaymentMethodTypes[paymentMethod.type] || "usd";

  // convert the amount to EUR/CAD if the payment method is sepa_debit or acss_debit
  if (Object.keys(nonUsdPaymentMethodTypes).includes(paymentMethod.type)) {
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

  const { users } = await prisma.project.update({
    where: {
      id: workspace.id,
    },
    data: {
      payoutsUsage: {
        increment: totalPayoutAmount,
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
    },
  });

  await log({
    message: `*${program.name}* just sent a payout of *${currencyFormatter(totalPayoutAmount)}* :money_with_wings: \n\n Fees earned: *${currencyFormatter(invoiceFee)} (${payoutFee * 100}%)* :money_mouth_face:`,
    type: "payouts",
  });

  const qstashResponse = await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/process/updates`,
    body: {
      invoiceId: invoice.id,
    },
  });

  if (qstashResponse.messageId) {
    console.log(`Message sent to Qstash with id ${qstashResponse.messageId}`);
  } else {
    console.error("Error sending message to Qstash", qstashResponse);
  }

  await queueBatchEmail<typeof ProgramPayoutThankYou>(
    users.map(({ user }) => ({
      to: user.email!,
      subject: `Thank you for your ${currencyFormatter(totalPayoutAmount)} payout to ${res.count} partners`,
      templateName: "ProgramPayoutThankYou",
      templateProps: {
        email: user.email!,
        workspace,
        program: {
          name: program.name,
        },
        payout: {
          amount: totalPayoutAmount,
          partnersCount: res.count,
        },
      },
    })),
  );
}
