import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { createStripePromotionCode } from "@/lib/stripe/create-stripe-promotion-code";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, chunk, log } from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  discountId: z.string(),
  page: z.number().optional().default(0),
});

// POST /api/cron/links/create-promotion-codes
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    let { discountId, page } = schema.parse(JSON.parse(rawBody));

    // Find the discount
    const discount = await prisma.discount.findUnique({
      where: {
        id: discountId,
      },
      include: {
        program: true,
        partnerGroup: true,
      },
    });

    if (!discount) {
      return logAndRespond(`Discount ${discountId} not found.`, {
        logLevel: "error",
      });
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

    const { program, partnerGroup: group } = discount;

    if (!group) {
      return logAndRespond(
        `Discount ${discountId} does not associate with a partner group.`,
        {
          logLevel: "error",
        },
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

    const PAGE_SIZE = 50;
    const STRIPE_PROMO_BATCH_SIZE = 10;

    // Find the program enrollments for the partner group
    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        groupId: group.id,
        status: {
          in: ["approved"],
        },
      },
      orderBy: {
        id: "desc",
      },
      take: PAGE_SIZE,
      skip: page * PAGE_SIZE,
    });

    // Finished processing all the program enrollments
    if (programEnrollments.length === 0) {
      return logAndRespond(
        `No more program enrollments found in the partner group ${group.id}.`,
      );
    }

    page++;

    // Find the partner links for the enrollments
    const links = await prisma.link.findMany({
      where: {
        programId: program.id,
        partnerId: {
          in: programEnrollments.map(({ partnerId }) => partnerId),
        },
        couponCode: null,
      },
      select: {
        id: true,
        key: true,
        couponCode: true,
      },
      orderBy: {
        id: "desc",
      },
    });

    // If no links are found, schedule the next batch
    if (links.length === 0) {
      await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/create-promotion-codes`,
        body: {
          discountId: discount.id,
          page,
        },
      });

      return logAndRespond(`Scheduled the next batch (page=${page}).`);
    }

    const linksChunks = chunk(links, STRIPE_PROMO_BATCH_SIZE);
    const failedRequests: Error[] = [];

    // Create promotion codes in batches for the partner links
    for (const linksChunk of linksChunks) {
      const results = await Promise.allSettled(
        linksChunk.map((link) =>
          createStripePromotionCode({
            workspace,
            link,
            discount,
          }),
        ),
      );

      results.forEach((result) => {
        if (result.status === "rejected") {
          failedRequests.push(result.reason);
        }
      });

      // Wait for 2 second before the next batch
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (failedRequests.length > 0) {
      await log({
        message: `Error creating promotion codes for discount ${discount.id}  - ${failedRequests.map((error) => error.message).join(", ")}`,
        type: "alerts",
      });

      console.error(failedRequests);
    }

    // Schedule the next batch
    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/create-promotion-codes`,
      body: {
        discountId: discount.id,
        page,
      },
    });

    return logAndRespond(`Scheduled the next batch (page=${page}).`);
  } catch (error) {
    await log({
      message: `Error creating promotion codes for discount - ${error.message}`,
      type: "alerts",
    });

    console.error(error);

    return handleAndReturnErrorResponse(error);
  }
}
