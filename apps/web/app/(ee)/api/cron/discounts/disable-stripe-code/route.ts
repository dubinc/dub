import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { disableStripeDiscountCode } from "@/lib/stripe/disable-stripe-discount-code";
import { z } from "zod";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  code: z.string(),
  stripeConnectId: z.string(),
});

// POST /api/cron/discounts/disable-stripe-code
// Disable the promotion code on Stripe after the discount is deleted from Dub
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { code, stripeConnectId } = schema.parse(JSON.parse(rawBody));

    console.log(
      `Disabling discount code ${code} on Stripe for ${stripeConnectId}...`,
    );

    // Disable the discount code on Stripe
    await disableStripeDiscountCode({
      code,
      stripeConnectId,
    });

    return logAndRespond(
      `Discount code ${code} disabled from Stripe for ${stripeConnectId}.`,
    );
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
