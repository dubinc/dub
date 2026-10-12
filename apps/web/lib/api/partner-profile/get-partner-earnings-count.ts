import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { generateRandomName } from "@/lib/names";
import { prisma } from "@/lib/prisma";
import { getPartnerEarningsCountQuerySchema } from "@/lib/zod/schemas/partner-profile";
import { Prisma } from "@prisma/client";
import * as z from "zod/v4";
import { getEarningsProgramFilter } from "./get-earnings-program-id";
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
    type,
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
    programId: getEarningsProgramFilter(programId),
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
        ...(type && { type }),
        ...(status && { status }),
        ...(linkId && { linkId }),
        ...(customerId && { customerId }),
      },
    });

    return { count };
  }

  const groupedWhere: Prisma.CommissionWhereInput = {
    ...where,
    ...(type && groupBy !== "type" && { type }),
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
        select: {
          id: true,
          email: true,
          name: true,
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

    const customersById = new Map(customers.map((c) => [c.id, c]));
    const dataSharingByProgramId = new Map(
      programEnrollments.map((p) => [
        p.programId,
        p.customerDataSharingEnabledAt,
      ]),
    );

    return counts.map(({ customerId, programId, _count }) => {
      const customer = customerId ? customersById.get(customerId) : undefined;
      const customerDataSharingEnabledAt =
        dataSharingByProgramId.get(programId);

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
      select: {
        id: true,
        domain: true,
        key: true,
        url: true,
      },
    });

    const linksById = new Map(links.map((l) => [l.id, l]));

    return counts.map(({ linkId, _count }) => {
      const link = linkId ? linksById.get(linkId) : undefined;
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
