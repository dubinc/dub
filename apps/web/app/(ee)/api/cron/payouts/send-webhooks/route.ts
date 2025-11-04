import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { payoutWebhookEventSchema } from "@/lib/zod/schemas/payouts";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  invoiceId: z.string(),
  externalPayoutIds: z.array(z.string()),
});

// POST /api/cron/payouts/send-webhooks
// This route is used to send webhooks for external payouts in the background
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const { invoiceId, externalPayoutIds } = payloadSchema.parse(
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

    const externalPayouts = await prisma.payout.findMany({
      where: {
        id: {
          in: externalPayoutIds,
        },
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
    });

    if (externalPayouts.length === 0) {
      return logAndRespond(
        `No external payouts found for invoice ${invoiceId}. Skipping...`,
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

    for (const externalPayout of externalPayouts) {
      const data = payoutWebhookEventSchema.parse({
        ...externalPayout,
        external: true,
        partner: {
          ...externalPayout.partner,
          ...externalPayout.partner.programs[0],
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

    return new Response(
      `Webhooks published for ${externalPayouts.length} payouts.`,
    );
  } catch (error) {
    await log({
      message: `Error sending "payout.confirmed" webhooks: ${error.message}`,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
