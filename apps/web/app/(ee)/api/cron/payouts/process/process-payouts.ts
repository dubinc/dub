import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { exceededLimitError } from "@/lib/api/errors";
import { isPayoutExternalForProgram } from "@/lib/api/payouts/is-payout-external-for-program";
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
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { payoutWebhookEventSchema } from "@/lib/zod/schemas/payouts";
import type PartnerPayoutConfirmed from "@dub/email/templates/partner-payout-confirmed";
import { prisma } from "@dub/prisma";
import { currencyFormatter, log } from "@dub/utils";
import { Program, Project } from "@prisma/client";

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
    "id" | "name" | "logo" | "minPayoutAmount" | "supportEmail" | "payoutMode"
  >;
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
      programId: program.id,
      status: "pending",
      invoiceId: null,
      amount: {
        gte: program.minPayoutAmount,
      },
      ...(program.payoutMode === "internal" && {
        partner: {
          payoutsEnabledAt: {
            not: null,
          },
        },
      }),
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

  let externalPayouts = payouts.filter(({ partner }) =>
    isPayoutExternalForProgram({
      program,
      partner,
    }),
  );

  const internalPayouts = payouts.filter(
    ({ partner }) =>
      !isPayoutExternalForProgram({
        program,
        partner,
      }),
  );

  const externalPayoutAmount = externalPayouts.reduce(
    (total, payout) => total + payout.amount,
    0,
  );

  // This is the total amount of payouts that will be processed (included external and internal payouts)
  const totalPayoutAmount = payouts.reduce(
    (total, payout) => total + payout.amount,
    0,
  );

  console.log({
    totalPayoutAmount,
    externalPayoutAmount,
    internalPayouts: internalPayouts.map((p) => p.id),
    externalPayouts: externalPayouts.map((p) => p.id),
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

  // Charges are still apply for external payouts
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
    const updatedExternalPayouts = await prisma.payout.findMany({
      where: {
        id: {
          in: externalPayouts.map((p) => p.id),
        },
      },
      include: {
        partner: {
          include: {
            programs: {
              where: {
                programId: program.id,
              },
            },
          },
        },
      },
    });

    // TODO(kiran):
    // This won't scale well if we have a lot of external payouts
    // Should move to a dedicated job to send the webhooks for external payouts
    for (const externalPayout of updatedExternalPayouts) {
      const { partner, ...payout } = externalPayout;
      const { programs, ...partnerInfo } = partner;

      await sendWorkspaceWebhook({
        workspace,
        trigger: "payout.confirmed",
        data: payoutWebhookEventSchema.parse({
          ...payout,
          external: true,
          partner: {
            ...partnerInfo,
            ...programs[0],
          },
        }),
      });
    }
  }
}
