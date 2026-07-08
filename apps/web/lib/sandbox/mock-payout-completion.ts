import { prisma } from "@/lib/prisma";
import { sendBatchEmail } from "@dub/email";
import PartnerPayoutProcessed from "@dub/email/templates/partner-payout-processed";
import { currencyFormatter } from "@dub/utils";
import {
  CommissionStatus,
  Invoice,
  InvoiceStatus,
  PayoutStatus,
  Project,
} from "@prisma/client";
import { trackCommissionStatusUpdate } from "../api/commissions/track-commission-update-activity-log";
import { assertStagingWorkspace } from "./workspace-guards";

interface MockPayoutCompletionParams {
  invoice: Invoice;
  workspace: Pick<Project, "id" | "environment">;
}

// Mark the all payouts and commissions in the invoice as paid
export async function mockPayoutCompletion({
  invoice,
  workspace,
}: MockPayoutCompletionParams) {
  assertStagingWorkspace(workspace);

  const payouts = await prisma.payout.findMany({
    where: {
      invoiceId: invoice.id,
      status: PayoutStatus.processing,
    },
    orderBy: {
      id: "asc",
    },
    include: {
      program: {
        select: {
          id: true,
          name: true,
          logo: true,
          workspaceId: true,
          workspace: {
            select: {
              environment: true,
            },
          },
        },
      },
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

  const payoutIds = payouts.map((p) => p.id);

  const commissions = await prisma.commission.findMany({
    where: {
      payoutId: {
        in: payoutIds,
      },
    },
    select: {
      id: true,
      amount: true,
      earnings: true,
      status: true,
      programId: true,
    },
  });

  await prisma.$transaction([
    prisma.commission.updateMany({
      where: {
        payoutId: {
          in: payoutIds,
        },
      },
      data: {
        status: CommissionStatus.paid,
      },
    }),

    prisma.payout.updateMany({
      where: {
        id: {
          in: payoutIds,
        },
      },
      data: {
        status: PayoutStatus.completed,
        paidAt: new Date(),
      },
    }),

    prisma.invoice.update({
      where: {
        id: invoice.id,
      },
      data: {
        status: InvoiceStatus.completed,
        paidAt: new Date(),
      },
    }),
  ]);

  await trackCommissionStatusUpdate({
    workspaceId: workspace.id,
    programId: payouts[0].programId,
    commissions,
    newStatus: CommissionStatus.paid,
  });

  // Group partner -> payouts so we send only one email per partner when there are multiple payouts
  const partnerPayouts = payouts.reduce(
    (acc, payout) => {
      acc[payout.partnerId] = [...(acc[payout.partnerId] || []), payout];
      return acc;
    },
    {} as Record<string, typeof payouts>,
  );

  await sendBatchEmail(
    Object.values(partnerPayouts)
      .filter((partnerPayoutList) => partnerPayoutList[0].partner.email)
      .map((partnerPayoutList) => {
        const { partner, program, ...payout } = partnerPayoutList[0];

        return {
          variant: "notifications",
          to: partner.email!,
          subject: `You've received a ${currencyFormatter(payout.amount)} payout from ${program.name}`,
          react: PartnerPayoutProcessed({
            email: partner.email!,
            workspace: program.workspace,
            program,
            payout,
          }),
        };
      }),
  );
}
