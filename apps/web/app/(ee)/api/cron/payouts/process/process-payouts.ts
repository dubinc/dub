import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { exceededLimitError } from "@/lib/api/errors";
import { isPayoutExternalForProgram } from "@/lib/api/payouts/is-payout-external-for-program";
import { getPayoutEligibilityFilter } from "@/lib/api/payouts/payout-eligibility-filter";
import { qstash } from "@/lib/cron";
import { queueBatchEmail } from "@/lib/email/queue-batch-email";
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
import type PartnerPayoutConfirmed from "@dub/email/templates/partner-payout-confirmed";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, currencyFormatter, log } from "@dub/utils";
import { Payout, Program, Project } from "@prisma/client";

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
    payoutMode: "internal" | "hybrid" | "external";
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
      partner: {
        select: {
          email: true,
          payoutsEnabledAt: true,
          programs: {
            where: {
              programId: program.id,
            },
            select: {
              tenantId: true,
            },
          },
        },
      },
    },
  });

  if (payouts.length === 0) {
    return;
  }

  let externalPayouts: Pick<Payout, "id" | "amount">[] = [];
  let internalPayouts: Pick<Payout, "id" | "amount">[] = [];

  if (program.payoutMode === "internal") {
    internalPayouts = payouts;
  } else if (program.payoutMode === "external") {
    externalPayouts = payouts;
  } else if (program.payoutMode === "hybrid") {
    payouts.forEach((payout) => {
      if (
        isPayoutExternalForProgram({
          program,
          partner: payout.partner,
        })
      ) {
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

  let invoice = await prisma.invoice.findUniqueOrThrow({
    where: {
      id: invoiceId,
    },
  });

  const fastAchFee =
    invoice.paymentMethod === "ach_fast" ? FAST_ACH_FEE_CENTS : 0;
  const currency = paymentMethodToCurrency[paymentMethod.type] || "usd";
  const totalFee = Math.round(totalPayoutAmount * payoutFee) + fastAchFee;
  const total = totalPayoutAmount + totalFee;
  let convertedTotal = total - externalPayoutAmount;

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
      amount: totalPayoutAmount,
      fee: totalFee,
      total,
    },
  });

  await stripe.paymentIntents.create(
    {
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
    },
    {
      idempotencyKey: `payout-processing/${invoice.id}`,
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
      },
    });
  }

  // Mark external payouts as completed
  if (externalPayouts.length > 0) {
    await prisma.payout.updateMany({
      where: {
        id: {
          in: externalPayouts.map((p) => p.id),
        },
      },
      data: {
        invoiceId: invoice.id,
        status: "completed",
        userId,
        paidAt: new Date(),
      },
    });

    await prisma.commission.updateMany({
      where: {
        payoutId: {
          in: externalPayouts.map((p) => p.id),
        },
      },
      data: {
        status: "paid",
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
    message: `*${program.name}* just sent a payout of *${currencyFormatter(totalPayoutAmount / 100)}* :money_with_wings: \n\n Fees earned: *${currencyFormatter(totalFee / 100)} (${payoutFee * 100}%)* :money_mouth_face:`,
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
            status: externalPayoutsMap.has(payout.id)
              ? "completed"
              : "processing",
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
    DIRECT_DEBIT_PAYMENT_METHOD_TYPES.includes(paymentMethod.type)
  ) {
    await queueBatchEmail<typeof PartnerPayoutConfirmed>(
      payouts
        .filter((payout) => payout.partner.email)
        .map((payout) => ({
          to: payout.partner.email!,
          subject: "You've got money coming your way!",
          variant: "notifications",
          replyTo: program.supportEmail || "noreply",
          templateName: "PartnerPayoutConfirmed",
          templateProps: {
            email: payout.partner.email!,
            program: {
              id: program.id,
              name: program.name,
              logo: program.logo,
              payoutMode: program.payoutMode as
                | "internal"
                | "external"
                | undefined,
            },
            payout: {
              id: payout.id,
              amount: payout.amount,
              startDate: payout.periodStart,
              endDate: payout.periodEnd,
              paymentMethod: invoice.paymentMethod ?? "ach",
            },
          },
        })),
      {
        idempotencyKey: `payout-confirmed/${invoice.id}`,
      },
    );
  }

  // Send the webhooks for the external payouts
  if (externalPayouts.length > 0) {
    const qstashResponse = await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/send-webhooks`,
      body: {
        invoiceId: invoice.id,
        externalPayoutIds: externalPayouts.map((p) => p.id),
      },
      deduplicationId: `publish-payout-confirmed-webhooks-${invoice.id}`,
    });

    if (qstashResponse.messageId) {
      console.log(`Message sent to Qstash with id ${qstashResponse.messageId}`);
    } else {
      console.error("Error sending message to Qstash", qstashResponse);
    }
  }
}
