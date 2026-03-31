import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { createStablecoinPayout } from "@/lib/partners/create-stablecoin-payout";
import { createStripeTransfer } from "@/lib/partners/create-stripe-transfer";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  partnerId: z.string(),
  invoiceId: z.string().optional(),
  chargeId: z.string().optional(),
});

// POST /api/cron/payouts/send-stripe-payout
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const { partnerId, invoiceId, chargeId } = payloadSchema.parse(
      JSON.parse(rawBody),
    );

    const payout = await prisma.payout.findFirst({
      where: {
        partnerId,
        invoiceId,
        status: "processing",
        mode: "internal",
        method: {
          in: ["connect", "stablecoin"],
        },
      },
      select: {
        method: true,
      },
    });

    if (!payout) {
      return logAndRespond(
        `No payout found for partner ${partnerId} and invoice ${invoiceId}`,
      );
    }

    // Run the appropriate payout creation function based on the payout method
    if (payout.method === "connect") {
      await createStripeTransfer({
        partnerId,
        invoiceId,
        chargeId,
      });
    } else if (payout.method === "stablecoin") {
      await createStablecoinPayout({
        partnerId,
        invoiceId,
      });
    }

    return logAndRespond(
      `Processed send-stripe-payout job for partner ${partnerId} and invoice ${invoiceId}`,
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await log({
      message: `Error sending Stripe payout: ${errorMessage}`,
      type: "errors",
      mention: true,
    });

    return handleAndReturnErrorResponse(error);
  }
}
