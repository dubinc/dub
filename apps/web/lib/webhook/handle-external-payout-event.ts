import { prisma } from "@dub/prisma";
import { PayoutStatus, Webhook } from "@dub/prisma/client";
import { z } from "zod";
import { payoutWebhookEventSchema } from "../zod/schemas/payouts";

interface WebhookPayload {
  webhook: Pick<Webhook, "id" | "installationId">;
  status: "success" | "failure" | "temporary_failure";
  payload: {
    id: string;
    data: z.infer<typeof payoutWebhookEventSchema>;
    event: "payout.confirmed";
  };
}

export async function handleExternalPayoutEvent({
  webhook,
  status,
  payload,
}: WebhookPayload) {
  if (payload.event !== "payout.confirmed") {
    console.log("Event is not a payout.confirmed event. Skipping...");
    return;
  }

  if (status === "temporary_failure") {
    console.log("Temporary failure event. Skipping...");
    return;
  }

  if (webhook.installationId) {
    console.log("This webhook is associated with an installation. Skipping...");
    return;
  }

  const { id: payoutId } = payoutWebhookEventSchema
    .pick({ id: true })
    .parse(payload.data);

  const payout = await prisma.payout.findUnique({
    where: {
      id: payoutId,
    },
  });

  if (!payout) {
    console.error(`Payout not found for id ${payoutId}.`);
    return;
  }

  if (payout.mode !== "external") {
    console.log("Payout is not an external payout. Skipping...");
    return;
  }

  // The payout was already processed by another webhook event
  if (payout.webhookEventId) {
    console.log(
      "Payout was already processed by another webhook event. Skipping...",
    );
    return;
  }

  // The payout is already completed or failed
  if (payout.status !== "processing") {
    console.log("Payout is not in the processing state. Skipping...");
    return;
  }

  const payoutStatus: PayoutStatus =
    status === "success" ? "completed" : "failed";

  await prisma.$transaction(async (tx) => {
    await tx.payout.update({
      where: {
        id: payout.id,
      },
      data: {
        status: payoutStatus,
        webhookEventId: payload.id,
        ...(payoutStatus === "completed"
          ? {
              paidAt: new Date(),
            }
          : {
              failureReason: "External webhook failed to process the payout.",
            }),
      },
    });

    if (payoutStatus === "completed") {
      await tx.commission.updateMany({
        where: {
          payoutId: payout.id,
        },
        data: {
          status: "paid",
        },
      });
    }
  });

  console.log(`Marked payout ${payout.id} as ${payoutStatus}.`);
}
