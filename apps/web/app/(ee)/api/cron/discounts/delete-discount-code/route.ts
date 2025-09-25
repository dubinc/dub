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

    const discountCode = await prisma.discountCode.findUnique({
      where: {
        id: discountCodeId,
      },
    });

    if (!discountCode) {
      return logAndRespond(`Discount code ${discountCodeId} not found.`);
    }

    if (discountCode.discountId) {
      return logAndRespond(`Discount code ${discountCodeId} is not deleted.`);
    }

    const workspace = await prisma.project.findUniqueOrThrow({
      where: {
        defaultProgramId: discountCode.programId,
      },
      select: {
        stripeConnectId: true,
      },
    });

    const disabledDiscountCode = await disableStripeDiscountCode({
      code: discountCode.code,
      stripeConnectId: workspace.stripeConnectId,
    });

    if (disabledDiscountCode) {
      await prisma.discountCode.delete({
        where: {
          id: discountCodeId,
        },
      });
    }

    return logAndRespond(
      `Discount code ${discountCode.code} disabled from Stripe for ${workspace.stripeConnectId}.`,
    );
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
