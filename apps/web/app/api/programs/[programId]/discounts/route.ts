import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { DiscountSchema } from "@/lib/zod/schemas/discount";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/programs/[programId]/discounts - get all discounts for a program
export const GET = withWorkspace(async ({ workspace, params }) => {
  const { programId } = params;

  await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

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
