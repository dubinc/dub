import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { disableStripePromotionCode } from "@/lib/stripe/disable-stripe-promotion-code";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  linkId: z.string(),
  couponCode: z.string(),
  workspaceId: z.string(),
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

  const { linkId, couponCode, workspaceId } = payload;

  // Find the workspace
  const workspace = await prisma.project.findUnique({
    where: {
      id: workspaceId,
    },
    select: {
      id: true,
      stripeConnectId: true,
    },
  });

  if (!workspace) {
    return logAndRespond(
      `Workspace with id ${workspaceId} not found. Skipping...`,
      {
        logLevel: "error",
      },
    );
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

    if (updatedCouponCode) {
      const link = await prisma.link.findUnique({
        where: {
          id: linkId,
        },
        select: {
          couponCode: true,
        },
      });

      // Link won't exists if it's deleted
      if (link && link.couponCode === couponCode) {
        await prisma.link.update({
          where: {
            id: linkId,
          },
          data: {
            couponCode: null,
          },
        });
      }
    }
  } catch (error) {
    return logAndRespond(error.message, {
      status: 400,
    });
  }

  return logAndRespond(`Finished executing the job for the link ${linkId}.`);
}
