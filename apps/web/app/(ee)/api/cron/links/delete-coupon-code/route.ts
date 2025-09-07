import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { disableStripePromotionCode } from "@/lib/stripe/disable-stripe-promotion-code";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  linkId: z.string(),
  couponCode: z.string(),
});

// POST /api/cron/links/delete-coupon-code
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

  const { linkId, couponCode } = payload;

  // Find the link
  const link = await prisma.link.findUnique({
    where: {
      id: linkId,
    },
    select: {
      couponCode: true,
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

  const workspace = link.project;

  if (!workspace) {
    return logAndRespond(`Link ${linkId} does not have a workspace.`, {
      logLevel: "error",
    });
  }

  try {
    const updatedCouponCode = await disableStripePromotionCode({
      workspace: {
        id: workspace.id,
        stripeConnectId: workspace.stripeConnectId,
      },
      link: {
        couponCode,
      },
    });

    if (updatedCouponCode && link.couponCode === couponCode) {
      await prisma.link.update({
        where: {
          id: linkId,
        },
        data: {
          couponCode: null,
        },
      });
    }
  } catch (error) {
    return logAndRespond(error.message, {
      status: 400,
    });
  }

  return logAndRespond(`Finished executing the job for the link ${linkId}.`);
}
