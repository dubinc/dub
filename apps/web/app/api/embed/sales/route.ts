import { withEmbedToken } from "@/lib/embed/auth";
import { SALES_PAGE_SIZE } from "@/lib/partners/constants";
import z from "@/lib/zod";
import { PartnerEarningsSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/embed/sales – get sales for a link from an embed token
export const GET = withEmbedToken(
  async ({ programId, partnerId, searchParams }) => {
    const { page } = z
      .object({ page: z.coerce.number().optional().default(1) })
      .parse(searchParams);

    const sales = await prisma.sale.findMany({
      where: {
        programId,
        partnerId,
      },
      select: {
        id: true,
        amount: true,
        earnings: true,
        currency: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: {
            email: true,
            avatar: true,
          },
        },
      },
      take: SALES_PAGE_SIZE,
      skip: (page - 1) * SALES_PAGE_SIZE,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(z.array(PartnerEarningsSchema).parse(sales));
  },
);
