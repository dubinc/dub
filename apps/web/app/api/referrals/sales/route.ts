import { withEmbedToken } from "@/lib/auth/embed-token";
import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { PartnerSaleResponseSchema } from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";

// GET /api/referrals/sales – get sales for a link
export const GET = withEmbedToken(async ({ link }) => {
  const sales = await prisma.sale.findMany({
    where: {
      linkId: link.id,
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
    take: 3,
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(z.array(PartnerSaleResponseSchema).parse(sales));
});
