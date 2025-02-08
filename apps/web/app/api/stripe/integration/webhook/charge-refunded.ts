import { prisma } from "@dub/prisma";
import type Stripe from "stripe";

// Handle event "charge.refunded"
export async function chargeRefunded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;
  const stripeAccountId = event.account as string;

  if (!charge.invoice) {
    return `Charge ${charge.id} has no invoice, skipping...`;
  }

  const workspace = await prisma.project.findUnique({
    where: {
      stripeConnectId: stripeAccountId,
    },
    select: {
      id: true,
      programs: true,
    },
  });

  if (!workspace) {
    return `Workspace not found for stripe account ${stripeAccountId}`;
  }

  if (!workspace.programs.length) {
    return `Workspace ${workspace.id} for stripe account ${stripeAccountId} has no programs, skipping...`;
  }

  try {
    const commission = await prisma.commission.update({
      where: {
        programId_invoiceId: {
          programId: workspace.programs[0].id,
          invoiceId: charge.invoice as string,
        },
      },
      data: {
        status: "refunded",
      },
    });

    return `Commission ${commission.id} updated to status "refunded"`;
  } catch (error) {
    console.error(error);
    return `Error updating commission ${charge.invoice} for workspace ${workspace.id}: ${error}`;
  }
}
