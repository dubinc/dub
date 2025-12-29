import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { createStripeTransfer } from "@/lib/partners/create-stripe-transfer";
import { log } from "@dub/utils";
import { z } from "zod";
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

    await createStripeTransfer({
      partnerId,
      invoiceId,
      chargeId,
    });

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
