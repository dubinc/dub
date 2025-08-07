import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { createStripePromotionCode } from "@/lib/stripe/create-stripe-promotion-code";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, chunk, log } from "@dub/utils";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  discountId: z.string(),
  page: z.number().optional().default(1),
});

const PAGE_LIMIT = 20;
const MAX_BATCHES = 5;

// This route is used to create promotion codes for each link for link-based coupon codes tracking.
// POST /api/cron/links/create-promotion-codes
export async function POST(req: Request) {
  let discountId: string | undefined;

  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const parsedBody = schema.parse(JSON.parse(rawBody));

    const { page } = parsedBody;
    discountId = parsedBody.discountId;

    const {
      couponId,
      programId,
      program: { couponCodeTrackingEnabledAt },
    } = await prisma.discount.findUniqueOrThrow({
      where: {
        id: discountId,
      },
      select: {
        couponId: true,
        programId: true,
        program: {
          select: {
            couponCodeTrackingEnabledAt: true,
          },
        },
      },
    });

    if (!couponCodeTrackingEnabledAt) {
      return new Response(
        "couponCodeTrackingEnabledAt is not set for the program. Skipping promotion code creation.",
      );
    }

    if (!couponId) {
      return new Response(
        "couponId doesn't set for the discount. Skipping promotion code creation.",
      );
    }

    const { stripeConnectId } = await prisma.project.findUniqueOrThrow({
      where: {
        defaultProgramId: programId,
      },
      select: {
        stripeConnectId: true,
      },
    });

    if (!stripeConnectId) {
      return new Response("stripeConnectId doesn't exist for the workspace.");
    }

    let hasMore = true;
    let currentPage = page;
    let processedBatches = 0;

    while (hasMore && processedBatches < MAX_BATCHES) {
      const enrollments = await prisma.programEnrollment.findMany({
        where: {
          programId,
          discountId,
        },
        select: {
          partnerId: true,
        },
        orderBy: {
          id: "desc",
        },
        take: PAGE_LIMIT,
        skip: (currentPage - 1) * PAGE_LIMIT,
      });

      if (enrollments.length === 0) {
        console.log("No more enrollments found.");
        hasMore = false;
        break;
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
        console.log("No more links found.");
        continue;
      }

      const linksChunks = chunk(links, 10);
      const failedRequests: Error[] = [];

      for (const linksChunk of linksChunks) {
        const results = await Promise.allSettled(
          linksChunk.map(({ key }) =>
            createStripePromotionCode({
              code: key,
              couponId,
              stripeConnectId,
            }),
          ),
        );

        results.forEach((result) => {
          if (result.status === "rejected") {
            failedRequests.push(result.reason);
          }
        });

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      if (failedRequests.length > 0) {
        console.error(failedRequests);
      }

      currentPage++;
      processedBatches++;
    }

    if (hasMore) {
      await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/create-promotion-codes`,
        body: {
          discountId,
          page: currentPage,
        },
      });
    }

    return new Response("OK");
  } catch (error) {
    await log({
      message: `Error creating Stripe promotion codes for discount ${discountId}: ${error.message}`,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
