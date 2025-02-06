import { withEmbedToken } from "@/lib/embed/auth";
import { SALES_PAGE_SIZE } from "@/lib/partners/constants";
import z from "@/lib/zod";
import { PartnerCommissionSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { CommissionStatus } from "@prisma/client";
import { NextResponse } from "next/server";

// GET /api/embed/commissions – get commissions for a partner from an embed token
export const GET = withEmbedToken(
  async ({ programId, partnerId, searchParams }) => {
    const { page } = z
      .object({ page: z.coerce.number().optional().default(1) })
      .parse(searchParams);

    const commissions = await prisma.commission.findMany({
      where: {
        programId,
        partnerId,
        status: {
          notIn: [
            CommissionStatus.refunded,
            CommissionStatus.duplicate,
            CommissionStatus.fraud,
          ],
        },
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

    return NextResponse.json(
      z.array(PartnerCommissionSchema).parse(commissions),
    );
  },
);
