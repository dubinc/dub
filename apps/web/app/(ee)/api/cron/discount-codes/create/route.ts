import { withCron } from "@/lib/cron/with-cron";
import { createDiscountCode } from "@/lib/discounts/create-discount-code";
import { prisma } from "@dub/prisma";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  linkId: z
    .string()
    .describe("The ID of the link to create a discount code for."),
});

// POST /api/cron/discount-codes/create
export const POST = withCron(async ({ rawBody }) => {
  const { linkId } = inputSchema.parse(JSON.parse(rawBody));

  const link = await prisma.link.findUnique({
    where: {
      id: linkId,
    },
    select: {
      id: true,
      discountCode: true,
      partnerGroupDefaultLinkId: true,
      programEnrollment: {
        select: {
          discount: true,
          groupId: true,
          partner: {
            select: {
              id: true,
              name: true,
            },
          },
          program: {
            select: {
              id: true,
            },
          },
        },
      },
      project: {
        select: {
          id: true,
          stripeConnectId: true,
          shopifyStoreId: true,
        },
      },
    },
  });

  if (!link || !link.project) {
    return logAndRespond(`Link ${linkId} not found. Skipping...`);
  }

  if (link.discountCode) {
    return logAndRespond(
      `Link ${linkId} already has a discount code. Skipping...`,
    );
  }

  if (link.partnerGroupDefaultLinkId === null) {
    return logAndRespond(`Link ${linkId} is not a default link. Skipping...`);
  }

  if (!link.programEnrollment) {
    return logAndRespond(
      `Link ${linkId} is not associated with a program enrollment. Skipping...`,
    );
  }

  const { project: workspace, programEnrollment } = link;
  const { partner, discount, program } = programEnrollment;

  if (!discount) {
    return logAndRespond(
      `Partner ${partner.id} does not have a discount with program ${program.id}. Skipping...`,
    );
  }

  try {
    await createDiscountCode({
      workspace,
      partner,
      link,
      discount,
    });
  } catch (error) {
    const message: string = error?.message ?? "";
    if (
      message.startsWith("STRIPE_CONNECTION_REQUIRED") ||
      message.startsWith("SHOPIFY_CONNECTION_REQUIRED") ||
      message.startsWith("SHOPIFY_APP_UPGRADE_REQUIRED")
    ) {
      return logAndRespond(`Skipping link ${linkId}: ${message}`);
    }
    throw error;
  }

  return logAndRespond(`Discount code created for link ${linkId}.`);
});
