import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { disableStripeDiscountCode } from "@/lib/stripe/disable-stripe-discount-code";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  discountCodeId: z.string(),
});

// POST /api/cron/discounts/delete-discount-code
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { discountCodeId } = schema.parse(JSON.parse(rawBody));

    // Find the discount code
    const discountCode = await prisma.discountCode.findUnique({
      where: {
        id: discountCodeId,
      },
      select: {
        code: true,
        program: {
          select: {
            id: true,
            workspace: {
              select: {
                stripeConnectId: true,
              },
            },
          },
        },
      },
    });

    if (!discountCode) {
      return logAndRespond(`Discount code ${discountCodeId} not found.`);
    }

    const program = discountCode.program;
    const workspace = program.workspace;

    if (!workspace.stripeConnectId) {
      return logAndRespond(
        `stripeConnectId not found for the program ${program.id}.`,
        {
          status: 400,
          logLevel: "error",
        },
      );
    }

    // Disable the discount code on Stripe
    await disableStripeDiscountCode({
      stripeConnectId: workspace.stripeConnectId,
      code: discountCode.code,
    });

    await prisma.discountCode.delete({
      where: {
        id: discountCodeId,
      },
    });

    return logAndRespond(`Discount code ${discountCodeId} deleted.`);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
