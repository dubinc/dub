import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { payoutWebhookEventSchema } from "@/lib/zod/schemas/payouts";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

export const maxDuration = 600;

const payloadSchema = z.object({
  invoiceId: z.string(),
  startingAfter: z.string().optional(),
});

const PAYOUT_BATCH_SIZE = 100;

// POST /api/cron/payouts/send-webhooks
// Note: Currently we send webhooks for external payouts only
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const { invoiceId, startingAfter } = payloadSchema.parse(
      JSON.parse(rawBody),
    );

    const invoice = await prisma.invoice.findUnique({
      where: {
        id: invoiceId,
      },
      include: {
        workspace: true,
        program: true,
      },
    });

    if (!invoice) {
      return logAndRespond(`Invoice ${invoiceId} not found.`);
    }

    const { workspace, program } = invoice;

    if (!workspace || !program) {
      return logAndRespond(
        `Workspace or program not found for invoice ${invoiceId}.`,
      );
    }

    const payouts = await prisma.payout.findMany({
      where: {
        invoiceId,
        mode: "external",
      },
      include: {
        partner: {
          include: {
            programs: {
              where: {
                programId: program.id,
              },
              select: {
                tenantId: true,
                status: true,
              },
            },
          },
        },
      },
      take: PAYOUT_BATCH_SIZE,
      ...(startingAfter && {
        cursor: {
          id: startingAfter,
        },
        skip: 1,
      }),
      orderBy: {
        id: "asc",
      },
    });

    if (payouts.length === 0) {
      return logAndRespond(
        `No payouts found for invoice ${invoiceId} starting after ${startingAfter}. Skipping...`,
      );
    }

    const webhooks = await prisma.webhook.findMany({
      where: {
        projectId: workspace.id,
        disabledAt: null,
        triggers: {
          array_contains: ["payout.confirmed"],
        },
      },
      select: {
        id: true,
        url: true,
        secret: true,
      },
    });

    if (webhooks.length === 0) {
      return logAndRespond(
        `No active webhooks with trigger "payout.confirmed" found for workspace ${workspace.id}.`,
      );
    }

    for (const payout of payouts) {
      const data = payoutWebhookEventSchema.parse({
        ...payout,
        partner: {
          ...payout.partner,
          ...payout.partner.programs[0],
        },
      });

      try {
        await sendWorkspaceWebhook({
          workspace,
          webhooks,
          data,
          trigger: "payout.confirmed",
        });
      } catch (error) {
        console.error(error.message);
      }
    }

    if (payouts.length === PAYOUT_BATCH_SIZE) {
      const response = await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/send-webhooks`,
        method: "POST",
        body: {
          invoiceId,
          startingAfter: payouts[payouts.length - 1].id,
        },
      });

      if (response.messageId) {
        console.log(`Message sent to Qstash with id ${response.messageId}`);
      } else {
        console.error("Error sending message to Qstash", response);
      }

      return logAndRespond(
        `Enqueued next page to send webhooks for invoice ${invoiceId}.`,
      );
    }

    return new Response(
      `Finished sending "payout.confirmed" webhooks for invoice ${invoiceId}.`,
    );
  } catch (error) {
    await log({
      message: `Error sending "payout.confirmed" webhooks: ${error.message}`,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
