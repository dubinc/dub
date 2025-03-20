import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { generateRandomName } from "@/lib/names";
import { getPartnerEarningsCountQuerySchema } from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId]/earnings/count – get earnings count for a partner in a program enrollment
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { program } = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId: params.programId,
    });

    const {
      groupBy,
      type = "sale",
      status,
      linkId,
      customerId,
      payoutId,
      interval,
      start,
      end,
    } = getPartnerEarningsCountQuerySchema.parse(searchParams);
    const { startDate, endDate } = getStartEndDates({
      interval,
      start,
      end,
    });

    const where: Prisma.CommissionWhereInput = {
      programId: program.id,
      partnerId: partner.id,
      ...(type && { type }),
      ...(payoutId && { payoutId }),
      createdAt: {
        gte: startDate.toISOString(),
        lte: endDate.toISOString(),
      },
    };

    if (groupBy) {
      let counts = await prisma.commission.groupBy({
        by: [groupBy],
        where: {
          ...where,
          ...(status && groupBy !== "status" && { status }),
          ...(linkId && groupBy !== "linkId" && { linkId }),
          ...(customerId && groupBy !== "customerId" && { customerId }),
        },
        _count: true,
        orderBy: {
          _count: {
            [groupBy]: "desc",
          },
        },
      });

      if (groupBy === "linkId") {
        const links = await prisma.link.findMany({
          where: {
            id: {
              in: counts.map(({ linkId }) => linkId),
            },
          },
        });
        counts = counts.map(({ linkId, _count }) => {
          const link = links.find((l) => l.id === linkId);
          return {
            id: linkId,
            domain: link?.domain,
            key: link?.key,
            url: link?.url,
            _count,
          };
        }) as any[]; // TODO: find a better fix for types
      } else if (groupBy === "customerId") {
        const customers = await prisma.customer.findMany({
          where: {
            id: {
              in: counts
                .map(({ customerId }) => customerId)
                .filter((id): id is string => id !== null),
            },
          },
        });
        counts = counts.map(({ customerId, _count }) => {
          const customer = customers.find((c) => c.id === customerId);
          return {
            id: customerId,
            email: customer?.email
              ? customer.email.replace(/(?<=^.).+(?=.@)/, "********")
              : customer?.name || generateRandomName(),
            _count,
          };
        }) as any[]; // TODO: find a better fix for types
      }

      return NextResponse.json(counts);
    } else {
      const count = await prisma.commission.count({
        where: {
          ...where,
          ...(status && { status }),
          ...(linkId && { linkId }),
          ...(customerId && { customerId }),
        },
      });

      return NextResponse.json({ count });
    }
  },
);
