import { getDiscountOrThrow } from "@/lib/api/partners/get-discount-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { discountPartnersQuerySchema } from "@/lib/zod/schemas/discount";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/discounts/partners – get partners that are part of a discount
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const { discountId } = discountPartnersQuerySchema.parse(searchParams);

  await getDiscountOrThrow({
    programId,
    discountId,
  });

  const partners = await prisma.programEnrollment.findMany({
    where: {
      discountId,
    },
    select: {
      partner: {
        select: {
          id: true,
          name: true,
          image: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json(partners.map(({ partner }) => partner));
});
