import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { disableStripePromotionCode } from "@/lib/stripe/disable-stripe-promotion-code";
import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  groupId: z.string(),
});

// POST /api/cron/links/delete-promotion-codes
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
      },
    });

    if (!group) {
      return logAndRespond({
        message: `Partner group ${groupId} not found.`,
        logLevel: "error",
      });
    }

    // Find the workspace for the program
    const workspace = await prisma.project.findUnique({
      where: {
        id: group.program.workspaceId,
      },
      select: {
        stripeConnectId: true,
      },
    });

    if (!workspace) {
      return logAndRespond({
        message: `Workspace ${group.program.workspaceId} not found.`,
        logLevel: "error",
      });
    }

    if (!workspace.stripeConnectId) {
      return logAndRespond({
        message: `Workspace ${group.program.workspaceId} does not have a stripeConnectId set.`,
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
          programId: group.program.id,
          partnerId: {
            in: enrollments.map(({ partnerId }) => partnerId),
          },
          couponCode: {
            not: null,
          },
        },
        select: {
          id: true,
          couponCode: true,
        },
      });

      if (links.length === 0) {
        page++;
        continue;
      }

      const linksChunks = chunk(links, 50);
      const failedRequests: Error[] = [];

      // Disable promotion codes in batches for the partner links
      for (const linksChunk of linksChunks) {
        const results = await Promise.allSettled(
          linksChunk.map((link) =>
            disableStripePromotionCode({
              promotionCode: link.couponCode,
              stripeConnectId: workspace.stripeConnectId,
            }),
          ),
        );

        results.forEach((result) => {
          if (result.status === "rejected") {
            failedRequests.push(result.reason);
          }
        });

        await prisma.link.updateMany({
          where: {
            id: {
              in: linksChunk.map(({ id }) => id),
            },
          },
          data: {
            couponCode: null,
          },
        });

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (failedRequests.length > 0) {
        console.error(failedRequests);
      }

      page++;
    }

    return logAndRespond({
      message: `Promotion codes deleted for group ${groupId}.`,
    });
  } catch (error) {
    console.log(error);

    return handleAndReturnErrorResponse(error);
  }
}
