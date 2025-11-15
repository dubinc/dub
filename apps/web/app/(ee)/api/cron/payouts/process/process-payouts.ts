import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getEffectivePayoutMode } from "@/lib/api/payouts/get-effective-payout-mode";
import { getPayoutEligibilityFilter } from "@/lib/api/payouts/payout-eligibility-filter";
import {
  DIRECT_DEBIT_PAYMENT_METHOD_TYPES,
  FAST_ACH_FEE_CENTS,
  FOREX_MARKUP_RATE,
} from "@/lib/constants/payouts";
import { queueBatchEmail } from "@/lib/email/queue-batch-email";
import { exceededLimitError } from "@/lib/exceeded-limit-error";
import {
  CUTOFF_PERIOD,
  CUTOFF_PERIOD_TYPES,
} from "@/lib/partners/cutoff-period";
import { stripe } from "@/lib/stripe";
import { createFxQuote } from "@/lib/stripe/create-fx-quote";
import { calculatePayoutFeeForMethod } from "@/lib/stripe/payment-methods";
import { PlanProps } from "@/lib/types";
import type PartnerPayoutConfirmed from "@dub/email/templates/partner-payout-confirmed";
import { prisma } from "@dub/prisma";
import { currencyFormatter, log } from "@dub/utils";
import {
  Partner,
  Payout,
  Program,
  ProgramPayoutMode,
  Project,
} from "@prisma/client";

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

  const payouts = await prisma.payout.findMany({
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
    select: {
      id: true,
      amount: true,
      periodStart: true,
      periodEnd: true,
      mode: true,
      partner: {
        select: {
          email: true,
          payoutsEnabledAt: true,
        },
      },
    },
  });

  if (payouts.length === 0) {
    return;
  }

  let invoice = await prisma.invoice.findUniqueOrThrow({
    where: {
      id: invoiceId,
    },
  });

  let externalPayouts: ExtendedPayout[] = [];
  let internalPayouts: ExtendedPayout[] = [];

  if (invoice.payoutMode === "internal") {
    internalPayouts = payouts;
  } else if (invoice.payoutMode === "external") {
    externalPayouts = payouts;
  } else if (invoice.payoutMode === "hybrid") {
    payouts.forEach((payout) => {
      const payoutMode = getEffectivePayoutMode({
        payoutMode: invoice.payoutMode,
        payoutsEnabledAt: payout.partner.payoutsEnabledAt,
      });

      if (payoutMode === "external") {
        externalPayouts.push(payout);
      } else {
        internalPayouts.push(payout);
      }
    });
  }

  // This is the total amount of payouts that will be processed (included external and internal payouts)
  const totalPayoutAmount = payouts.reduce(
    (total, payout) => total + payout.amount,
    0,
  );

  const externalPayoutAmount = externalPayouts.reduce(
    (total, payout) => total + payout.amount,
    0,
  );

  console.log({
    internalPayouts: internalPayouts.map((p) => {
      return {
        id: p.id,
        amount: p.amount,
      };
    }),

    externalPayouts: externalPayouts.map((p) => {
      return {
        id: p.id,
        amount: p.amount,
      };
    }),
  });

  if (workspace.payoutsUsage + totalPayoutAmount > workspace.payoutsLimit) {
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

  const fastAchFee =
    invoice.paymentMethod === "ach_fast" ? FAST_ACH_FEE_CENTS : 0;
  const currency = paymentMethodToCurrency[paymentMethod.type] || "usd";
  const totalFee = Math.round(totalPayoutAmount * payoutFee) + fastAchFee;
  const total = totalPayoutAmount + totalFee;
  let totalToSend = total - externalPayoutAmount;

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
      (totalToSend / exchangeRate) * (1 + FOREX_MARKUP_RATE),
    );

    console.log(
      `Currency conversion: ${totalToSend} usd -> ${convertedTotal} ${currency} using exchange rate ${exchangeRate}.`,
    );

    totalToSend = convertedTotal;
  }

  // Update the invoice with the finalized payout amount, fee, and total
  invoice = await prisma.invoice.update({
    where: {
      id: invoiceId,
    },
    data: {
      amount: totalPayoutAmount,
      externalAmount: externalPayoutAmount,
      fee: totalFee,
      total,
    },
  });

  await stripe.paymentIntents.create(
    {
      amount: totalToSend,
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

  // Mark internal payouts as processing
  if (internalPayouts.length > 0) {
    await prisma.payout.updateMany({
      where: {
        id: {
          in: internalPayouts.map((p) => p.id),
        },
      },
      data: {
        invoiceId: invoice.id,
        status: "processing",
        userId,
        mode: "internal",
      },
    });
  }

  // Mark external payouts as processing
  if (externalPayouts.length > 0) {
    await prisma.payout.updateMany({
      where: {
        id: {
          in: externalPayouts.map((p) => p.id),
        },
      },
      data: {
        invoiceId: invoice.id,
        status: "processing",
        userId,
        mode: "external",
      },
    });
  }

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
    message: `*${program.name}* just sent a payout of *${currencyFormatter(totalPayoutAmount)}* :money_with_wings: \n\n Fees earned: *${currencyFormatter(totalFee)} (${payoutFee * 100}%)* :money_mouth_face:`,
    type: "payouts",
  });

  const userWhoInitiatedPayout = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  const externalPayoutsMap = new Map(externalPayouts.map((p) => [p.id, p]));

  await recordAuditLog(
    payouts.map((payout) => ({
      workspaceId: workspace.id,
      programId: program.id,
      action: "payout.confirmed",
      description: `Payout ${payout.id} confirmed`,
      actor: userWhoInitiatedPayout ?? {
        id: userId,
        name: "Unknown user", // should never happen but just in case
      },
      targets: [
        {
          type: "payout",
          id: payout.id,
          metadata: {
            ...payout,
            invoiceId: invoice.id,
            status: "processing",
            mode: externalPayoutsMap.has(payout.id) ? "external" : "internal",
            userId,
          },
        },
      ],
    })),
  );

  // Send emails to all the partners involved in the payouts if the payout method is Direct Debit
  // This is because Direct Debit takes 4 business days to process, so we want to give partners a heads up
  if (
    invoice &&
    internalPayouts.length > 0 &&
    DIRECT_DEBIT_PAYMENT_METHOD_TYPES.includes(paymentMethod.type)
  ) {
    await queueBatchEmail<typeof PartnerPayoutConfirmed>(
      internalPayouts
        .filter((payout) => payout.partner.email)
        .map((payout) => ({
          to: payout.partner.email!,
          subject: `Your ${currencyFormatter(payout.amount)} payout for ${program.name} is on the way`,
          variant: "notifications",
          replyTo: program.supportEmail || "noreply",
          templateName: "PartnerPayoutConfirmed",
          templateProps: {
            email: payout.partner.email!,
            program: {
              id: program.id,
              name: program.name,
              logo: program.logo,
            },
            payout: {
              id: payout.id,
              amount: payout.amount,
              startDate: payout.periodStart,
              endDate: payout.periodEnd,
              mode: "internal",
              paymentMethod: invoice.paymentMethod ?? "ach",
            },
          },
        })),
      {
        idempotencyKey: `payout-confirmed-internal/${invoice.id}`,
      },
    );
  }
}
