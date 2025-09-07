import { enqueueCouponCodeCreateJobs } from "@/lib/api/discounts/enqueue-coupon-code-create-jobs";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, chunk } from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;
const MAX_BATCH = 10;

const schema = z.object({
  discountId: z.string(),
  cursor: z.string().optional(),
});

// POST /api/cron/discounts/enqueue-coupon-code-create-jobs
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    let { discountId, cursor } = schema.parse(JSON.parse(rawBody));

    // Find the discount
    const discount = await prisma.discount.findUnique({
      where: {
        id: discountId,
      },
      include: {
        partnerGroup: true,
      },
    });

    if (!discount) {
      return logAndRespond(`Discount ${discountId} not found.`, {
        logLevel: "error",
      });
    }

    if (!discount.couponCodeTrackingEnabledAt) {
      return logAndRespond(
        `Discount ${discountId} does not have coupon code tracking enabled.`,
      );
    }

    const group = discount.partnerGroup;

    if (!group) {
      return logAndRespond(
        `Discount ${discountId} does not have a partner group.`,
      );
    }

    let hasMore = true;
    let processedBatches = 0;

    while (processedBatches < MAX_BATCH) {
      // Find program enrollments for the group
      const programEnrollments = await prisma.programEnrollment.findMany({
        where: {
          groupId: group.id,
          ...(cursor && {
            createdAt: {
              gt: cursor,
            },
          }),
        },
        select: {
          id: true,
          links: {
            select: {
              id: true,
              key: true,
              couponCode: true,
            },
          },
        },
        take: PAGE_SIZE,
        orderBy: {
          createdAt: "asc",
        },
      });

      if (programEnrollments.length === 0) {
        hasMore = false;
        break;
      }

      // Find links without a coupon code
      const links = programEnrollments.flatMap(({ links }) =>
        links.filter(({ couponCode }) => !couponCode),
      );

      // Enqueue the coupon creation job for each link
      if (links.length > 0) {
        const linkChunks = chunk(links, 100);

        for (const linkChunk of linkChunks) {
          await enqueueCouponCodeCreateJobs({
            links: linkChunk,
          });

          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      cursor = programEnrollments[programEnrollments.length - 1].id;
      processedBatches++;
    }

    if (hasMore) {
      await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discounts/create-promotion-codes`,
        body: {
          discountId,
          cursor,
        },
      });
    }

    return new Response("Enqueued coupon creation job for the links.");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
