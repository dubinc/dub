import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { createStripePromotionCode } from "@/lib/stripe/create-stripe-promotion-code";
import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  discountId: z.string(),
});

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
      include: {
        partnerGroup: true,
        program: true,
      },
    });

    if (!discount) {
      return logAndRespond({
        message: `Discount ${discountId} not found.`,
        logLevel: "error",
      });
    }

    if (!discount.couponId) {
      return logAndRespond({
        message: `Discount ${discountId} does not have a couponId set.`,
        logLevel: "error",
      });
    }

    if (!discount.couponCodeTrackingEnabledAt) {
      return logAndRespond({
        message: `Discount ${discountId} is not enabled for coupon code tracking.`,
      });
    }

    if (!discount.partnerGroup) {
      return logAndRespond({
        message: `Discount ${discountId} is not associated with a partner group.`,
        logLevel: "error",
      });
    }

    // Find the workspace for the program
    const workspace = await prisma.project.findUnique({
      where: {
        id: discount.program.workspaceId,
      },
      select: {
        stripeConnectId: true,
      },
    });

    if (!workspace) {
      return logAndRespond({
        message: `Workspace ${discount.program.workspaceId} not found.`,
        logLevel: "error",
      });
    }

    if (!workspace.stripeConnectId) {
      return logAndRespond({
        message: `Workspace ${discount.program.workspaceId} does not have a stripeConnectId set.`,
        logLevel: "error",
      });
    }

    let page = 0;
    let hasMore = true;
    const pageSize = 50;

    while (hasMore) {
      // Find all enrollments for the partner group
      const enrollments = await prisma.programEnrollment.findMany({
        where: {
          groupId: discount.partnerGroup.id,
        },
        orderBy: {
          id: "desc",
        },
        take: pageSize,
        skip: page * pageSize,
      });

      if (enrollments.length === 0) {
        hasMore = false;
        break;
      }

      // Find all links for the enrollments
      const links = await prisma.link.findMany({
        where: {
          programId: discount.programId,
          partnerId: {
            in: enrollments.map(({ partnerId }) => partnerId),
          },
          couponCode: null,
        },
        select: {
          id: true,
          key: true,
        },
      });

      if (links.length === 0) {
        page++;
        continue;
      }

      const linksChunks = chunk(links, 50);
      const failedRequests: Error[] = [];

      // Create promotion codes in batches for the partner links
      for (const linksChunk of linksChunks) {
        const results = await Promise.allSettled(
          linksChunk.map((link) =>
            createStripePromotionCode({
              link,
              coupon: discount,
              stripeConnectId: workspace.stripeConnectId,
            }),
          ),
        );

        results.forEach((result) => {
          if (result.status === "rejected") {
            failedRequests.push(result.reason);
          }
        });

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (failedRequests.length > 0) {
        console.error(failedRequests);
      }

      page++;
    }

    return logAndRespond({
      message: `Promotion codes created for discount ${discountId}.`,
    });
  } catch (error) {
    console.log(error);

    return handleAndReturnErrorResponse(error);
  }
}
