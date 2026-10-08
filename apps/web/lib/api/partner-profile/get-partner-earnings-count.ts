import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { generateRandomName } from "@/lib/names";
import { prisma } from "@/lib/prisma";
import { getPartnerEarningsCountQuerySchema } from "@/lib/zod/schemas/partner-profile";
import { NETWORK_PROGRAM_ID } from "@dub/utils";
import { Prisma } from "@prisma/client";
import * as z from "zod/v4";
import { obfuscateCustomerEmail } from "./obfuscate-customer-email";

export async function getPartnerEarningsCount({
  partnerId,
  programId,
  filters,
}: {
  partnerId: string;
  programId?: string; // if not provided, earnings across all programs (except the network program) are counted
  filters: z.infer<typeof getPartnerEarningsCountQuerySchema>;
}) {
  const {
    groupBy,
    status,
    linkId,
    customerId,
    payoutId,
    interval,
    start,
    end,
    timezone,
  } = filters;

  const { startDate, endDate } = getStartEndDates({
    interval,
    start,
    end,
    timezone,
  });

  const where: Prisma.CommissionWhereInput = {
    earnings: {
      not: 0,
    },
    programId: programId ?? {
      not: NETWORK_PROGRAM_ID,
    },
    partnerId,
    ...(payoutId && { payoutId }),
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (!groupBy) {
    const count = await prisma.commission.count({
      where: {
        ...where,
        ...(status && { status }),
        ...(linkId && { linkId }),
        ...(customerId && { customerId }),
      },
    });

    return { count };
  }

  const groupedWhere: Prisma.CommissionWhereInput = {
    ...where,
    ...(status && groupBy !== "status" && { status }),
    ...(linkId && groupBy !== "linkId" && { linkId }),
    ...(customerId && groupBy !== "customerId" && { customerId }),
  };

  if (groupBy === "customerId") {
    // grouped by program too, since customer data sharing is set per program enrollment
    const counts = await prisma.commission.groupBy({
      by: ["customerId", "programId"],
      where: groupedWhere,
      _count: true,
      orderBy: {
        _count: {
          customerId: "desc",
        },
      },
    });

    const [customers, programEnrollments] = await Promise.all([
      prisma.customer.findMany({
        where: {
          id: {
            in: counts
              .map(({ customerId }) => customerId)
              .filter((id): id is string => id !== null),
          },
        },
      }),
      prisma.programEnrollment.findMany({
        where: {
          partnerId,
          programId: {
            in: [...new Set(counts.map(({ programId }) => programId))],
          },
        },
        select: {
          programId: true,
          customerDataSharingEnabledAt: true,
        },
      }),
    ]);

    return counts.map(({ customerId, programId, _count }) => {
      const customer = customers.find((c) => c.id === customerId);
      const customerDataSharingEnabledAt = programEnrollments.find(
        (p) => p.programId === programId,
      )?.customerDataSharingEnabledAt;

      return {
        id: customerId,
        email: customer?.email
          ? customerDataSharingEnabledAt
            ? customer.email
            : obfuscateCustomerEmail(customer.email)
          : customer?.name || generateRandomName(),
        _count,
      };
    });
  }

  const counts = await prisma.commission.groupBy({
    by: [groupBy],
    where: groupedWhere,
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
          in: counts
            .map(({ linkId }) => linkId)
            .filter((id): id is string => id !== null),
        },
      },
    });

    return counts.map(({ linkId, _count }) => {
      const link = links.find((l) => l.id === linkId);
      return {
        id: linkId,
        domain: link?.domain,
        key: link?.key,
        url: link?.url,
        _count,
      };
    });
  }

  return counts;
}
