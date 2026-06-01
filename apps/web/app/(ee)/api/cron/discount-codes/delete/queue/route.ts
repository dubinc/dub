import { withCron } from "@/lib/cron/with-cron";
import { deleteDiscountCodes } from "@/lib/discounts/delete-discount-code";
import { prisma } from "@dub/prisma";
import { DiscountProvider } from "@dub/prisma/client";
import * as z from "zod/v4";
import { logAndRespond } from "../../../utils";

export const dynamic = "force-dynamic";

export const maxDuration = 600;

const inputSchema = z.object({
  discountId: z.string(),
  provider: z.enum(DiscountProvider),
});

// POST /api/cron/discount-codes/delete/queue
export const POST = withCron(async ({ rawBody }) => {
  const { discountId, provider } = inputSchema.parse(JSON.parse(rawBody));

  let startingAfter: string | undefined;

  while (true) {
    const discountCodes = await prisma.discountCode.findMany({
      where: {
        discountId,
      },
      select: {
        id: true,
        code: true,
        programId: true,
      },
      ...(startingAfter && {
        skip: 1,
        cursor: {
          id: startingAfter,
        },
      }),
      orderBy: {
        id: "asc",
      },
      take: 500,
    });

    if (discountCodes.length === 0) {
      break;
    }

    startingAfter = discountCodes[discountCodes.length - 1].id;

    await deleteDiscountCodes(
      discountCodes.map((discountCode) => ({
        ...discountCode,
        discount: {
          provider,
        },
      })),
    );
  }

  return logAndRespond(
    `Finished queuing discount codes for discount ${discountId}.`,
  );
});
