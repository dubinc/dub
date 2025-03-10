import { getDiscountOrThrow } from "@/lib/api/partners/get-discount-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { discountPartnersQuerySchema } from "@/lib/zod/schemas/discount";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/discounts/partners – get partners that are part of a discount
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { programId } = params;

    const { discountId, page, pageSize } =
      discountPartnersQuerySchema.parse(searchParams);

    await Promise.all([
      getProgramOrThrow({
        workspaceId: workspace.id,
        programId,
      }),

      getDiscountOrThrow({
        programId,
        discountId,
      }),
    ]);

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
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json(partners.map(({ partner }) => partner));
  },
);
