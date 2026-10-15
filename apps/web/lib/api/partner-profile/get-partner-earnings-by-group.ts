import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { prisma } from "@/lib/prisma";
import {
  PARTNER_PROFILE_EARNINGS_ATTRIBUTE_GROUP_BY,
  partnerProfileEarningsAnalyticsQuerySchema,
  PartnerProfileTopLinkEarningsSchema,
  PartnerProfileTopProgramEarningsSchema,
  PartnerProfileTypeEarningsSchema,
} from "@/lib/zod/schemas/partner-profile";
import { COUNTRIES_TO_CONTINENTS } from "@dub/utils";
import { Prisma } from "@prisma/client";
import * as z from "zod/v4";
import {
  getPartnerEarningsSqlWhere,
  getPartnerEarningsWhere,
} from "./get-partner-earnings-where";

// the program fields that the partner earnings routes return with each group
export const programSelect = {
  id: true,
  name: true,
  slug: true,
  logo: true,
} satisfies Prisma.ProgramSelect;

export async function getPartnerEarningsByGroup({
  partnerId,
  programId,
  filters,
}: {
  partnerId: string;
  programId?: string; // if not provided, earnings across all programs (except the network program) are summed
  filters: Omit<
    z.infer<typeof partnerProfileEarningsAnalyticsQuerySchema>,
    "programIdOrSlug"
  >;
}) {
  const {
    groupBy,
    limit,
    type,
    linkId,
    customerId,
    payoutId,
    status,
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

  const earningsFilters = {
    partnerId,
    programId,
    startDate,
    endDate,
    type,
    status,
    linkId,
    customerId,
    payoutId,
  };

  if (isAttributeGroupBy(groupBy)) {
    return getPartnerEarningsByAttribute({
      groupBy,
      limit,
      sqlWhere: getPartnerEarningsSqlWhere(earningsFilters, "c"),
    });
  }

  const where = getPartnerEarningsWhere(earningsFilters);

  if (groupBy === "programId") {
    const sums = await prisma.commission.groupBy({
      by: ["programId"],
      where,
      _sum: {
        earnings: true,
      },
      orderBy: {
        _sum: {
          earnings: "desc",
        },
      },
      take: limit,
    });

    const programs = await prisma.program.findMany({
      where: {
        id: {
          in: sums.map(({ programId }) => programId),
        },
      },
      select: programSelect,
    });

    return z.array(PartnerProfileTopProgramEarningsSchema).parse(
      sums.flatMap(({ programId, _sum }) => {
        const program = programs.find((p) => p.id === programId);
        return program ? [{ ...program, earnings: _sum.earnings ?? 0 }] : [];
      }),
    );
  }

  if (groupBy === "type") {
    const sums = await prisma.commission.groupBy({
      by: ["type"],
      where,
      _sum: {
        earnings: true,
      },
      orderBy: {
        _sum: {
          earnings: "desc",
        },
      },
      take: limit,
    });

    return z.array(PartnerProfileTypeEarningsSchema).parse(
      sums.map(({ type, _sum }) => ({
        type,
        earnings: _sum.earnings ?? 0,
      })),
    );
  }

  const sums = await prisma.commission.groupBy({
    by: ["linkId"],
    where: {
      ...where,
      linkId: {
        not: null,
      },
    },
    _sum: {
      earnings: true,
    },
    orderBy: {
      _sum: {
        earnings: "desc",
      },
    },
    take: limit,
  });

  const links = await prisma.link.findMany({
    where: {
      id: {
        in: sums
          .map(({ linkId }) => linkId)
          .filter((id): id is string => id !== null),
      },
    },
    select: {
      id: true,
      domain: true,
      key: true,
      shortLink: true,
      url: true,
      program: {
        select: programSelect,
      },
    },
  });

  return z.array(PartnerProfileTopLinkEarningsSchema).parse(
    sums.flatMap(({ linkId, _sum }) => {
      const link = links.find((l) => l.id === linkId);
      return link?.program
        ? [{ ...link, program: link.program, earnings: _sum.earnings ?? 0 }]
        : [];
    }),
  );
}

type AttributeGroupBy =
  (typeof PARTNER_PROFILE_EARNINGS_ATTRIBUTE_GROUP_BY)[number];

function isAttributeGroupBy(groupBy: string): groupBy is AttributeGroupBy {
  return (
    PARTNER_PROFILE_EARNINGS_ATTRIBUTE_GROUP_BY as readonly string[]
  ).includes(groupBy);
}

// the column of each attribute group (a continent is summed from the countries)
const ATTRIBUTE_COLUMNS: Record<AttributeGroupBy, Prisma.Sql> = {
  domain: Prisma.sql`l.domain`,
  utm_source: Prisma.sql`l.utm_source`,
  utm_medium: Prisma.sql`l.utm_medium`,
  utm_campaign: Prisma.sql`l.utm_campaign`,
  utm_term: Prisma.sql`l.utm_term`,
  utm_content: Prisma.sql`l.utm_content`,
  country: Prisma.sql`cu.country`,
  continent: Prisma.sql`cu.country`,
};

// sums earnings by a field of the commission's link or customer. Commissions without one, or with an empty value, are left out
async function getPartnerEarningsByAttribute({
  groupBy,
  limit,
  sqlWhere,
}: {
  groupBy: AttributeGroupBy;
  limit: number;
  sqlWhere: Prisma.Sql; // the earnings conditions on Commission, with the alias "c"
}) {
  const column = ATTRIBUTE_COLUMNS[groupBy];
  const isCustomerField = groupBy === "country" || groupBy === "continent";

  const sums = await prisma.$queryRaw<
    { groupValue: string; totalEarnings: number }[]
  >`
    SELECT ${column} AS groupValue, SUM(c.earnings) AS totalEarnings
    FROM Commission c
    ${isCustomerField ? Prisma.sql`INNER JOIN Customer cu ON cu.id = c.customerId` : Prisma.sql`INNER JOIN Link l ON l.id = c.linkId`}
    WHERE
      ${sqlWhere}
      AND ${column} IS NOT NULL
      AND ${column} != ''
    GROUP BY groupValue
    ORDER BY totalEarnings DESC
    ${groupBy === "continent" ? Prisma.sql`` : Prisma.sql`LIMIT ${limit}`}
  `;

  const groups =
    groupBy === "continent"
      ? Object.entries(
          sums.reduce<Record<string, number>>(
            (acc, { groupValue, totalEarnings }) => {
              const continent =
                COUNTRIES_TO_CONTINENTS[groupValue.toUpperCase()];
              if (continent) {
                acc[continent] = (acc[continent] ?? 0) + Number(totalEarnings);
              }
              return acc;
            },
            {},
          ),
        )
          .map(([value, earnings]) => ({ value, earnings }))
          .sort((a, b) => b.earnings - a.earnings)
          .slice(0, limit)
      : sums.map(({ groupValue, totalEarnings }) => ({
          value: groupValue,
          earnings: Number(totalEarnings),
        }));

  return groups.map(({ value, earnings }) => ({
    [groupBy]: value,
    earnings,
  }));
}
