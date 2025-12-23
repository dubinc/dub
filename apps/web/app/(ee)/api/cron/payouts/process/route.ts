import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { CUTOFF_PERIOD_ENUM } from "@/lib/partners/cutoff-period";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../../utils";
import { processPayouts } from "./process-payouts";
import { splitPayouts } from "./split-payouts";

export const dynamic = "force-dynamic";
export const maxDuration = 600; // This function can run for a maximum of 10 minutes

const processPayoutsCronSchema = z.object({
  workspaceId: z.string(),
  userId: z.string(),
  invoiceId: z.string(),
  paymentMethodId: z.string(),
  cutoffPeriod: CUTOFF_PERIOD_ENUM,
  selectedPayoutId: z.string().optional(),
  excludedPayoutIds: z.array(z.string()).optional(),
});

// POST /api/cron/payouts/process
// This route is used to process payouts for a given invoice
// we're intentionally offloading this to a cron job to avoid blocking the main thread
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({ req, rawBody });

    const {
      workspaceId,
      userId,
      invoiceId,
      paymentMethodId,
      cutoffPeriod,
      selectedPayoutId,
      excludedPayoutIds,
    } = processPayoutsCronSchema.parse(JSON.parse(rawBody));

    const workspace = await prisma.project.findUniqueOrThrow({
      where: {
        id: workspaceId,
      },
      include: {
        programs: true,
        invoices: {
          where: {
            id: invoiceId,
          },
        },
      },
    });

    // should never happen, but just in case
    if (workspace.programs.length === 0) {
      return logAndRespond(
        `Workspace ${workspaceId} has no programs. Skipping...`,
      );
    }

    const program = workspace.programs[0];

    // should never happen, but just in case
    if (workspace.invoices.length === 0) {
      return logAndRespond(
        `Invoice ${invoiceId} not found for workspace ${workspaceId}. Skipping...`,
      );
    }

    const invoice = workspace.invoices[0];

    // avoid race condition where Stripe's charge.failed webhook is processed before this cron job
    if (invoice.status === "failed") {
      return logAndRespond(
        `Invoice ${invoiceId} has already been marked as failed. Skipping...`,
      );
    }

    if (cutoffPeriod) {
      await splitPayouts({
        program,
        cutoffPeriod,
        selectedPayoutId,
        excludedPayoutIds,
      });
    }

    await processPayouts({
      workspace,
      program,
      invoice,
      userId,
      paymentMethodId,
      cutoffPeriod,
      selectedPayoutId,
      excludedPayoutIds,
    });

    return logAndRespond(`Processed payouts for program ${program.name}.`);
  } catch (error) {
    await log({
      message: `Error confirming payouts for program: ${error.message}`,
      type: "errors",
      mention: true,
    });

    return handleAndReturnErrorResponse(error);
  }
}
