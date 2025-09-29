import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { disableStripeDiscountCode } from "@/lib/stripe/disable-stripe-discount-code";
import { prisma } from "@dub/prisma";
import { logAndRespond } from "../../../utils";

export const dynamic = "force-dynamic";

// POST /api/cron/discount-codes/[discountCodeId]/delete
export async function POST(
  req: Request,
  { params }: { params: Promise<{ discountCodeId: string }> },
) {
  try {
    const { discountCodeId } = await params;

    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const discountCode = await prisma.discountCode.findUnique({
      where: {
        id: discountCodeId,
      },
    });

    // Fake wait 5 seconds
    await new Promise((resolve) => setTimeout(resolve, 5000));

    if (!discountCode) {
      return logAndRespond(`Discount code ${discountCodeId} not found.`);
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
