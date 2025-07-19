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

    const { discountId } = schema.parse(JSON.parse(rawBody));

    const discount = await prisma.discount.findUnique({
      where: {
        id: discountId,
      },
    });

    if (!discount) {
      return new Response("Discount not found.");
    }

    if (!discount.couponId) {
      return new Response("couponId doesn't set for the discount.");
    }

    const workspace = await prisma.project.findUniqueOrThrow({
      where: {
        defaultProgramId: discount.programId,
      },
      select: {
        stripeConnectId: true,
      },
    });

    if (!workspace.stripeConnectId) {
      return new Response("stripeConnectId doesn't exist for the workspace.");
    }

    const enrollments = await prisma.programEnrollment.findMany({
      where: {
        programId: discount.programId,
        discountId: discount.id,
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
        programId: discount.programId,
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

    const linksChunks = chunk(links, 20);
    const failedRequests: Error[] = [];

    for (const linksChunk of linksChunks) {
      const results = await Promise.allSettled(
        linksChunk.map(({ key }) =>
          createStripePromotionCode({
            code: key,
            couponId: discount.couponId!,
            stripeConnectId: workspace.stripeConnectId,
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
