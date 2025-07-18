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

  const discount = await getDiscountOrThrow({
    programId,
    discountId,
  });

  // For the default discount, return only non-eligible partners
  // For additional discounts, return all eligible partners
  const partners = await prisma.programEnrollment.findMany({
    where: {
      programId,
      discountId: discount.default ? null : discountId,
      status: {
        in: ["approved", "invited"],
      },
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
    orderBy: {
      partner: {
        name: "asc",
      },
    },
  });

  return NextResponse.json(partners.map(({ partner }) => partner));
});
