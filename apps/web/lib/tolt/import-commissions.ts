import { sendEmail } from "@dub/email";
import CampaignImported from "@dub/email/templates/campaign-imported";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { CommissionStatus } from "@prisma/client";
import { createId } from "../api/create-id";
import { syncTotalCommissions } from "../api/partners/sync-total-commissions";
import { getLeadEvent } from "../tinybird";
import { recordSaleWithTimestamp } from "../tinybird/record-sale";
import { clickEventSchemaTB } from "../zod/schemas/clicks";
import { ToltApi } from "./api";
import { MAX_BATCHES, toltImporter } from "./importer";
import { ToltCommission } from "./types";

const toDubStatus: Record<ToltCommission["status"], CommissionStatus> = {
  pending: "pending",
  approved: "pending",
  paid: "paid",
  rejected: "canceled",
  refunded: "refunded",
};

export async function importCommissions({
  programId,
  startingAfter,
}: {
  programId: string;
  startingAfter?: string;
}) {
  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    include: {
      workspace: true,
    },
  });

  const { workspace } = program;

  const { token, toltProgramId, userId } = await toltImporter.getCredentials(
    workspace.id,
  );

  const toltApi = new ToltApi({ token });

  let hasMore = true;
  let processedBatches = 0;

  while (hasMore && processedBatches < MAX_BATCHES) {
    const commissions = await toltApi.listCommissions({
      programId: toltProgramId,
      startingAfter,
    });

    if (commissions.length === 0) {
      hasMore = false;
      break;
    }

    await Promise.allSettled(
      commissions.map((commission) =>
        createCommission({
          workspaceId: workspace.id,
          programId,
          commission,
        }),
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));

    startingAfter = commissions[commissions.length - 1].id;
    processedBatches++;
  }

  if (hasMore) {
    await toltImporter.queue({
      programId,
      action: "import-commissions",
      startingAfter,
    });

    return;
  }

  await toltImporter.deleteCredentials(workspace.id);

  const workspaceUser = await prisma.projectUsers.findUniqueOrThrow({
    where: {
      userId_projectId: {
        userId,
        projectId: workspace.id,
      },
    },
    select: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  if (workspaceUser && workspaceUser.user.email) {
    await sendEmail({
      email: workspaceUser.user.email,
      subject: "Tolt program imported",
      react: CampaignImported({
        email: workspaceUser.user.email,
        workspace,
        program,
        provider: "Tolt",
      }),
    });
  }

  await toltImporter.queue({
    programId,
    action: "update-stripe-customers",
  });
}

// Backfill historical commissions
async function createCommission({
  workspaceId,
  programId,
  commission,
}: {
  workspaceId: string;
  programId: string;
  commission: ToltCommission;
}) {
  const { customer, partner, ...sale } = commission;

  if (!sale.transaction_id) {
    console.log(
      `Commission ${commission.id} has no transaction ID, skipping...`,
    );
    return;
  }

  const commissionFound = await prisma.commission.findUnique({
    where: {
      invoiceId_programId: {
        invoiceId: sale.transaction_id,
        programId,
      },
    },
  });

  if (commissionFound) {
    console.log(`Commission ${commission.id} already exists, skipping...`);
    return;
  }

  const customerFound = await prisma.customer.findFirst({
    where: {
      projectId: workspaceId,
      email: customer.email,
    },
    include: {
      link: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  if (!customerFound) {
    console.log(
      `No customer found for customer email ${customer.email}, skipping...`,
    );
    return;
  }

  // here, we also check for commissions that have already been recorded on Dub
  // e.g. during the transition period
  // since we don't have the Stripe invoiceId from Tolt, we use the referral's customer ID
  // and check for commissions that were created with the same amount and within a +-1 hour window
  const chargedAt = new Date(sale.created_at);
  const trackedCommission = await prisma.commission.findFirst({
    where: {
      programId,
      type: "sale",
      customer: {
        id: customerFound.id,
      },
      amount: Number(sale.amount),
      createdAt: {
        gte: new Date(chargedAt.getTime() - 60 * 60 * 1000), // 1 hour before
        lte: new Date(chargedAt.getTime() + 60 * 60 * 1000), // 1 hour after
      },
    },
  });

  if (trackedCommission) {
    console.log(
      `Commission ${trackedCommission.id} was already recorded on Dub, skipping...`,
    );
    return;
  }

  if (
    !customerFound.linkId ||
    !customerFound.clickId ||
    !customerFound.link?.partnerId
  ) {
    console.log(
      `No link or click ID or partner ID found for customer ${customerFound.id}, skipping...`,
    );
    return;
  }

  const leadEvent = await getLeadEvent({
    customerId: customerFound.id,
  });

  if (!leadEvent || leadEvent.data.length === 0) {
    console.log(
      `No lead event found for customer ${customerFound.id}, skipping...`,
    );
    return;
  }

  const clickData = clickEventSchemaTB
    .omit({ timestamp: true })
    .parse(leadEvent.data[0]);

  const eventId = nanoid(16);

  await Promise.all([
    prisma.commission.create({
      data: {
        id: createId({ prefix: "cm_" }),
        eventId,
        type: "sale",
        programId,
        partnerId: customerFound.link.partnerId,
        linkId: customerFound.linkId,
        customerId: customerFound.id,
        amount: Number(sale.revenue),
        earnings: Number(commission.amount),
        currency: "usd", // TODO: there is no currency in the commission
        quantity: 1,
        status: toDubStatus[commission.status],
        invoiceId: sale.transaction_id, // this is not the actual invoice ID, but we use this to deduplicate the sales
        createdAt: new Date(sale.created_at),
      },
    }),

    recordSaleWithTimestamp({
      ...clickData,
      event_id: eventId,
      event_name: "Invoice paid",
      amount: Number(sale.revenue),
      customer_id: customerFound.id,
      payment_processor: "stripe",
      currency: "usd", // TODO: there is no currency in the commission
      metadata: JSON.stringify(commission),
      timestamp: new Date(sale.created_at).toISOString(),
    }),

    // update link stats
    prisma.link.update({
      where: {
        id: customerFound.linkId,
      },
      data: {
        sales: {
          increment: 1,
        },
        saleAmount: {
          increment: Number(sale.revenue),
        },
      },
    }),

    // update customer stats
    prisma.customer.update({
      where: {
        id: customerFound.id,
      },
      data: {
        sales: {
          increment: 1,
        },
        saleAmount: {
          increment: Number(sale.revenue),
        },
      },
    }),
  ]);

  await syncTotalCommissions({
    partnerId: customerFound.link.partnerId,
    programId,
  });
}
