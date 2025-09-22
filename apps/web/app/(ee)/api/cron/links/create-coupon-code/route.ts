import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { createStripePromotionCode } from "@/lib/stripe/create-stripe-promotion-code";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { logAndRespond } from "../../utils";
import { constructPromotionCode } from "./utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  linkId: z.string(),
  code: z.string(),
});

// POST /api/cron/links/create-coupon-code
export async function POST(req: Request) {
  let payload: z.infer<typeof schema> | undefined = undefined;

  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    payload = schema.parse(JSON.parse(rawBody));
  } catch (error) {
    return logAndRespond(error.message, {
      logLevel: "error",
    });
  }

  const { linkId, code } = payload;

  // Find the link
  const link = await prisma.link.findUnique({
    where: {
      id: linkId,
    },
    select: {
      id: true,
      key: true,
      projectId: true,
      couponCode: true,
      programEnrollment: {
        select: {
          discount: true,
        },
      },
      project: {
        select: {
          id: true,
          stripeConnectId: true,
        },
      },
    },
  });

  if (!link) {
    return logAndRespond(`Link ${linkId} not found.`, {
      logLevel: "error",
    });
  }

  if (link.couponCode) {
    return logAndRespond(`Link ${linkId} already has a coupon code.`);
  }

  const discount = link.programEnrollment?.discount;
  const workspace = link.project;

  if (!discount) {
    return logAndRespond(`Link ${linkId} does not have a discount.`);
  }

  if (!discount.couponId) {
    return logAndRespond(`Link ${linkId} does not have a couponId set.`);
  }

  if (!discount.couponCodeTrackingEnabledAt) {
    return logAndRespond(
      `Link ${linkId} does not have coupon code tracking enabled.`,
    );
  }

  if (!workspace) {
    return logAndRespond(`Link ${linkId} does not have a workspace.`, {
      logLevel: "error",
    });
  }

  try {
    // Create the promotion code using Stripe API
    const stripePromotionCode = await createStripePromotionCode({
      workspace: {
        id: workspace.id,
        stripeConnectId: workspace.stripeConnectId,
      },
      discount: {
        id: discount.id,
        couponId: discount.couponId,
      },
      code,
    });

    // Update the link with the promotion code
    if (stripePromotionCode?.code) {
      console.log(
        `Stripe promotion code ${stripePromotionCode.code} created for the link ${link.id}.`,
      );

      await prisma.link.update({
        where: {
          id: link.id,
        },
        data: {
          couponCode: stripePromotionCode.code,
        },
      });
    }
  } catch (error) {
    const errorMessage = error.raw?.message || error.message;
    const isDuplicateError = errorMessage?.includes("already exists");

    if (isDuplicateError) {
      const newCode = constructPromotionCode({
        code,
        discount: {
          amount: discount.amount,
          type: discount.type,
        },
      });

      await enqueueCouponCodeCreateJobs({
        id: link.id,
        key: newCode,
      });
    }

    return logAndRespond(errorMessage, {
      logLevel: "info",
      status: isDuplicateError ? 200 : 400,
    });
  }

  return logAndRespond(`Finished executing the job for the link ${linkId}.`);
}
