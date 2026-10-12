import { prisma } from "@/lib/prisma";
import { sendBatchEmail } from "@dub/email";
import PartnerPayoutProcessed from "@dub/email/templates/partner-payout-processed";
import { chunk, currencyFormatter, log } from "@dub/utils";
import {
  CommissionStatus,
  Invoice,
  InvoiceStatus,
  PayoutStatus,
  Project,
} from "@prisma/client";
import { trackCommissionStatusUpdate } from "../api/commissions/track-commission-update-activity-log";
import { assertNotProductionWorkspace } from "./workspace-guards";

interface MockPayoutCompletionParams {
  invoice: Invoice;
  workspace: Pick<Project, "id" | "environment">;
}

// Mark internal payouts and their commissions as paid. External payouts stay
// processing until the webhook callback. The invoice is marked completed either way.
export async function mockPayoutCompletion({
  invoice,
  workspace,
}: MockPayoutCompletionParams) {
  assertNotProductionWorkspace(workspace, {
    message: "Mock payout completion is not available in production.",
  });

  const payouts = await prisma.payout.findMany({
    where: {
      invoiceId: invoice.id,
      status: PayoutStatus.processing,
      mode: "internal",
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
          environment: true,
        },
      },
      partner: {
        select: {
          email: true,
        },
      },
    },
  });

  const payoutIds = payouts.map((p) => p.id);

  await prisma.$transaction([
    prisma.invoice.update({
      where: {
        id: invoice.id,
      },
      data: {
        status: InvoiceStatus.completed,
        paidAt: new Date(),
      },
    }),
    ...(payoutIds.length > 0
      ? [
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
        ]
      : []),
  ]);

  if (payoutIds.length === 0) {
    console.log(
      `[mockPayoutCompletion] No internal payouts found for invoice ${invoice.id}, skipping commission updates...`,
    );
    return;
  }

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

  const commissionIds = commissions.map((c) => c.id);

  let totalUpdatedCommissions = 0;
  for (const commissionIdsBatch of chunk(commissionIds, 250)) {
    try {
      const { count } = await prisma.commission.updateMany({
        where: {
          id: {
            in: commissionIdsBatch,
          },
        },
        data: {
          status: CommissionStatus.paid,
        },
      });

      totalUpdatedCommissions += count;
      console.log(
        `Marked ${totalUpdatedCommissions}/${commissionIds.length} commissions as paid`,
      );
    } catch (error) {
      await log({
        message: `[mockPayoutCompletion] Failed to mark commissions as paid for payouts ${payoutIds.join(
          ", ",
        )}: ${error.message}`,
        type: "errors",
        mention: true,
      });
    }
  }

  // Group partner -> payouts so we send only one email per partner when there are multiple payouts
  const partnerPayouts = payouts.reduce(
    (acc, payout) => {
      acc[payout.partnerId] = [...(acc[payout.partnerId] || []), payout];
      return acc;
    },
    {} as Record<string, typeof payouts>,
  );

  await Promise.allSettled([
    trackCommissionStatusUpdate({
      workspaceId: workspace.id,
      programId: payouts[0].programId,
      commissions,
      newStatus: CommissionStatus.paid,
    }),

    sendBatchEmail(
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
              program,
              payout,
            }),
          };
        }),
    ),
  ]);
}
