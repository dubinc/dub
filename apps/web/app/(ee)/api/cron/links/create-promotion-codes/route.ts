import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { createStripePromotionCode } from "@/lib/stripe/create-stripe-promotion-code";
import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  groupId: z.string(),
});

// POST /api/cron/links/create-promotion-codes
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { groupId } = schema.parse(JSON.parse(rawBody));

    const group = await prisma.partnerGroup.findUnique({
      where: {
        id: groupId,
      },
      include: {
        program: true,
        discount: true,
      },
    });

    if (!group) {
      return logAndRespond(`Partner group ${groupId} not found.`, {
        logLevel: "error",
      });
    }

    const { discount, program } = group;

    if (!discount) {
      return logAndRespond(
        `Partner group ${groupId} does not have a discount.`,
        {
          logLevel: "error",
        },
      );
    }

    if (!discount.couponId) {
      return logAndRespond(
        `Discount ${discount.id} does not have a couponId set.`,
        {
          logLevel: "error",
        },
      );
    }

    if (!discount.couponCodeTrackingEnabledAt) {
      return logAndRespond(
        `Discount ${discount.id} is not enabled for coupon code tracking.`,
      );
    }

    // Find the workspace for the program
    const workspace = await prisma.project.findUnique({
      where: {
        id: program.workspaceId,
      },
      select: {
        id: true,
        stripeConnectId: true,
      },
    });

    if (!workspace) {
      return logAndRespond(`Workspace ${program.workspaceId} not found.`, {
        logLevel: "error",
      });
    }

    if (!workspace.stripeConnectId) {
      return logAndRespond(
        `Workspace ${program.workspaceId} does not have a stripeConnectId set.`,
        {
          logLevel: "error",
        },
      );
    }

    let page = 0;
    let hasMore = true;
    const pageSize = 50;

    while (hasMore) {
      // Find all enrollments for the partner group
      const enrollments = await prisma.programEnrollment.findMany({
        where: {
          groupId: group.id,
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
          programId: program.id,
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
              workspace: {
                id: workspace.id,
                stripeConnectId: workspace.stripeConnectId,
              },
              link: {
                id: link.id,
                key: link.key,
              },
              discount: {
                id: discount.id,
                couponId: discount.couponId,
                amount: discount.amount,
                type: discount.type,
              },
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

    return logAndRespond(
      `Promotion codes created for discount ${discount.id} in group ${groupId}.`,
    );
  } catch (error) {
    console.log(error);

    return handleAndReturnErrorResponse(error);
  }
}
