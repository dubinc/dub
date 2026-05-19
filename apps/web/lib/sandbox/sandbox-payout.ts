import { getPayoutEligibilityFilter } from "@/lib/api/payouts/payout-eligibility-filter";
import { payoutIdSelectionWhere } from "@/lib/api/payouts/payout-id-selection-where";
import {
  CUTOFF_PERIOD,
  CUTOFF_PERIOD_TYPES,
} from "@/lib/partners/cutoff-period";
import { sendBatchEmail } from "@dub/email";
import PartnerPayoutConfirmed from "@dub/email/templates/partner-payout-confirmed";
import { prisma } from "@dub/prisma";
import {
  Invoice,
  Program,
  ProgramPayoutMode,
  Project,
} from "@dub/prisma/client";
import { currencyFormatter } from "@dub/utils";
import { addSeconds } from "date-fns";
import { calculatePayoutFeeWithWaiver } from "../partners/calculate-payout-fee-with-waiver";
import { calculatePayoutFeeForMethod } from "../stripe/payment-methods";

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
    | "payoutFeeWaiverLimit"
    | "payoutFeeWaiverUsage"
    | "webhookEnabled"
  >;
  program: Pick<
    Program,
    "id" | "name" | "logo" | "url" | "minPayoutAmount" | "supportEmail"
  > & {
    payoutMode: ProgramPayoutMode;
  };
  invoice: Pick<Invoice, "id" | "paymentMethod">;
  userId: string;
  paymentMethodId: string;
  cutoffPeriod?: CUTOFF_PERIOD_TYPES;
  selectedPayoutIds?: string[];
  excludedPayoutIds?: string[];
}

export async function mockSandboxPayoutCompletion({
  workspace,
  program,
  invoice,
  userId,
  cutoffPeriod,
  selectedPayoutIds,
  excludedPayoutIds,
}: ProcessPayoutsProps) {
  const cutoffPeriodValue = CUTOFF_PERIOD.find(
    (c) => c.id === cutoffPeriod,
  )?.value;

  await prisma.$executeRaw`
    UPDATE Payout p
    INNER JOIN Partner pn ON p.partnerId = pn.id
    SET p.method = pn.defaultPayoutMethod
    WHERE p.invoiceId = ${invoice.id}
    AND pn.defaultPayoutMethod IS NOT NULL
    AND p.status = 'processing'
  `;

  await prisma.payout.updateMany({
    where: {
      ...payoutIdSelectionWhere({ selectedPayoutIds, excludedPayoutIds }),
      ...getPayoutEligibilityFilter({ program, workspace }),
      ...(cutoffPeriodValue && {
        periodEnd: {
          lte: cutoffPeriodValue,
        },
      }),
    },
    data: {
      invoiceId: invoice.id,
      status: "completed",
      userId,
      initiatedAt: new Date(),
      paidAt: addSeconds(new Date(), 5),
      mode: program.payoutMode === "external" ? "external" : "internal",
    },
  });

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

  const payoutFee = calculatePayoutFeeForMethod({
    paymentMethod: "us_bank_account",
    payoutFee: workspace.payoutFee,
  });

  if (!payoutFee) {
    throw new Error("Failed to calculate payout fee.");
  }

  const { fee: invoiceFee } = calculatePayoutFeeWithWaiver({
    payoutAmount: totalPayoutAmount,
    payoutFee,
    payoutFeeWaiverLimit: workspace.payoutFeeWaiverLimit,
    payoutFeeWaiverUsage: workspace.payoutFeeWaiverUsage,
  });

  await prisma.$transaction([
    prisma.invoice.update({
      where: {
        id: invoice.id,
      },
      data: {
        amount: totalPayoutAmount,
        externalAmount: totalExternalPayoutAmount,
        fee: invoiceFee,
        total: totalPayoutAmount + invoiceFee,
        status: "completed",
        paidAt: new Date(),
      },
    }),

    prisma.commission.updateMany({
      where: {
        payout: {
          invoiceId: invoice.id,
        },
      },
      data: {
        status: "paid",
      },
    }),
  ]);

  const payouts = await prisma.payout.findMany({
    where: {
      invoiceId: invoice.id,
    },
    include: {
      partner: true,
      program: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  const internalPayouts = payouts.filter(
    (payout) => payout.mode === "internal",
  );

  await sendBatchEmail(
    internalPayouts.map((payout) => ({
      to: payout.partner.email!,
      subject: `Your ${currencyFormatter(payout.amount)} payout for ${payout.program.name} is on the way`,
      variant: "notifications",
      replyTo: payout.program.supportEmail || "noreply",
      react: PartnerPayoutConfirmed({
        email: payout.partner.email!,
        program: {
          id: payout.program.id,
          name: payout.program.name,
          logo: payout.program.logo,
        },
        payout: {
          id: payout.id,
          amount: payout.amount,
          initiatedAt: payout.initiatedAt,
          startDate: payout.periodStart,
          endDate: payout.periodEnd,
          mode: payout.mode,
          paymentMethod: invoice.paymentMethod ?? "ach",
          payoutMethod: payout.partner.defaultPayoutMethod ?? null,
        },
      }),
    })),
  );

  // TODO:
  // Should we track the commission/payout status updates?
}
