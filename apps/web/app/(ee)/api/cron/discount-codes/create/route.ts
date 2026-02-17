import { createDiscountCode } from "@/lib/api/discounts/create-discount-code";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@dub/prisma";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  partnerId: z.string(),
  discountId: z.string(),
});

// POST /api/cron/discount-codes/create
export const POST = withCron(async ({ rawBody }) => {
  const { partnerId, discountId } = inputSchema.parse(JSON.parse(rawBody));

  const discount = await prisma.discount.findUnique({
    where: {
      id: discountId,
    },
    include: {
      program: {
        select: {
          id: true,
          workspace: {
            select: {
              id: true,
              stripeConnectId: true,
            },
          },
        },
      },
    },
  });

  if (!discount) {
    return logAndRespond(`Discount ${discountId} not found. Skipping...`);
  }

  const { program } = discount;
  const { workspace } = program;

  if (!workspace.stripeConnectId) {
    return logAndRespond(
      `Workspace ${workspace.id} does not have stripeConnectId set. Skipping...`,
    );
  }

  const { links, partner } = await getProgramEnrollmentOrThrow({
    partnerId,
    programId: program.id,
    include: {
      links: {
        select: {
          id: true,
        },
        // Only fetch links that don't have a discount code yet and are default links
        where: {
          discountCode: null,
          partnerGroupDefaultLinkId: {
            not: null,
          },
        },
      },
      partner: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (links.length === 0) {
    return logAndRespond(
      `Partner ${partnerId} has no links to create discount codes for. Skipping...`,
    );
  }

  for (const link of links) {
    await createDiscountCode({
      stripeConnectId: workspace.stripeConnectId,
      partner,
      link,
      discount,
    });
  }

  return logAndRespond(
    `Created discount codes for partner ${partner.id} in program ${program.id}.`,
  );
});
