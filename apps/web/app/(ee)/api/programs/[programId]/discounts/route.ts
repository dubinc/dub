import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { DiscountSchema } from "@/lib/zod/schemas/discount";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// TODO: Remove once we migrate fully to partner groups
// GET /api/programs/[programId]/discounts - get all discounts for a program
export const GET = withWorkspace(async ({ workspace }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const discounts = await prisma.discount.findMany({
    where: {
      programId,
    },
    include: {
      _count: {
        select: {
          programEnrollments: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const discountsWithPartnersCount = discounts.map((discount) => ({
    ...discount,
    partnersCount: discount._count.programEnrollments,
  }));

  return NextResponse.json(
    z.array(DiscountSchema).parse(discountsWithPartnersCount),
  );
});
