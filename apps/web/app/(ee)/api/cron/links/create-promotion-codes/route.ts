import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { createStripePromotionCode } from "@/lib/stripe/create-promotion-code";
import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  discountId: z.string(),
});

// This route is used to create promotion codes for each link for link-based coupon codes tracking.
// POST /api/cron/links/create-promotion-codes
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const body = schema.parse(JSON.parse(rawBody));
    const { discountId } = body;

    const discount = await prisma.discount.findUnique({
      where: {
        id: discountId,
      },
    });

    if (!discount) {
      return new Response("Discount not found.");
    }

    const { provider, programId, couponId } = discount;

    if (provider !== "stripe") {
      return new Response("Discount is not a link-based coupon code.");
    }

    if (!couponId) {
      return new Response("Discount coupon ID not found.");
    }

    const workspace = await prisma.project.findUnique({
      where: {
        defaultProgramId: programId,
      },
      select: {
        stripeConnectId: true,
      },
    });

    if (!workspace?.stripeConnectId) {
      return new Response("Workspace not found.");
    }

    const enrollments = await prisma.programEnrollment.findMany({
      where: {
        programId,
        couponId: discount.id,
      },
      select: {
        partnerId: true,
      },
    });

    if (enrollments.length === 0) {
      return new Response("No enrollments found.");
    }

    const links = await prisma.link.findMany({
      where: {
        programId,
        partnerId: {
          in: enrollments.map(({ partnerId }) => partnerId),
        },
      },
      select: {
        key: true,
      },
    });

    if (links.length === 0) {
      return new Response("No links found.");
    }

    const { stripeConnectId } = workspace;
    const linksChunks = chunk(links, 20);
    const failedRequests: Error[] = [];

    for (const linksChunk of linksChunks) {
      const results = await Promise.allSettled(
        linksChunk.map(({ key }) =>
          createStripePromotionCode({
            couponId,
            linkKey: key,
            stripeConnectId,
          }),
        ),
      );

      results.forEach((result) => {
        if (result.status === "rejected") {
          failedRequests.push(result.reason);
        }
      });
    }

    if (failedRequests.length > 0) {
      console.error(failedRequests);
    }

    return new Response(
      failedRequests.length > 0
        ? `Failed to create promotion codes for ${failedRequests.length} links. See logs for more details.`
        : "OK",
    );
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
