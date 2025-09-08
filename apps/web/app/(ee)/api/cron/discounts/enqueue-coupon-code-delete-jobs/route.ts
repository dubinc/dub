import { enqueueCouponCodeDeleteJobs } from "@/lib/api/discounts/enqueue-coupon-code-delete-jobs";
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
  groupId: z.string(),
  cursor: z.string().optional(),
});

// POST /api/cron/discounts/enqueue-coupon-code-delete-jobs
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    let { groupId, cursor } = schema.parse(JSON.parse(rawBody));

    // Find the group
    const group = await prisma.partnerGroup.findUnique({
      where: {
        id: groupId,
      },
    });

    if (!group) {
      return logAndRespond(`Group ${groupId} not found.`, {
        logLevel: "error",
      });
    }

    let hasMore = true;
    let processedBatches = 0;

    while (processedBatches < MAX_BATCH) {
      // Find program enrollments for the group
      const programEnrollments = await prisma.programEnrollment.findMany({
        where: {
          groupId: group.id,
          ...(cursor && {
            id: {
              gt: cursor,
            },
          }),
        },
        select: {
          id: true,
          links: {
            select: {
              id: true,
              couponCode: true,
            },
          },
        },
        take: PAGE_SIZE,
        orderBy: {
          id: "asc",
        },
      });

      if (programEnrollments.length === 0) {
        hasMore = false;
        break;
      }

      // Find links with a coupon code
      const links = programEnrollments.flatMap(({ links }) =>
        links.filter(({ couponCode }) => couponCode),
      );

      // Enqueue the coupon deletion job for each link
      if (links.length > 0) {
        const linkChunks = chunk(links, 100);

        for (const linkChunk of linkChunks) {
          await enqueueCouponCodeDeleteJobs(linkChunk);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      cursor = programEnrollments[programEnrollments.length - 1].id;
      processedBatches++;
    }

    if (hasMore) {
      await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discounts/enqueue-promotion-code-delete-jobs`,
        body: {
          groupId,
          cursor,
        },
      });
    }

    return new Response("Enqueued coupon deletion job for the links.");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
