import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DiscountSchema,
  getDiscountsQuerySchema,
} from "@/lib/zod/schemas/discount";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/discounts - get all discounts for a program
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);
  const { groupId } = getDiscountsQuerySchema.parse(searchParams);

  const discounts = await prisma.discount.findMany({
    where: {
      programId,
      ...(groupId && { groupId }),
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(
    z
      .array(DiscountSchema.extend({ groupId: z.string().nullable() }))
      .parse(discounts),
  );
});
