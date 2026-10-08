import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { prisma } from "@/lib/prisma";
import {
  partnerProfileTopEarningsQuerySchema,
  PartnerProfileTopLinkEarningsSchema,
  PartnerProfileTopProgramEarningsSchema,
} from "@/lib/zod/schemas/partner-profile";
import { NETWORK_PROGRAM_ID } from "@dub/utils";
import { Prisma } from "@prisma/client";
import * as z from "zod/v4";

const programSelect = {
  id: true,
  name: true,
  slug: true,
  logo: true,
} satisfies Prisma.ProgramSelect;

export async function getPartnerTopEarnings({
  partnerId,
  programId,
  filters,
}: {
  partnerId: string;
  programId?: string; // if not provided, earnings across all programs (except the network program) are summed
  filters: Omit<
    z.infer<typeof partnerProfileTopEarningsQuerySchema>,
    "programIdOrSlug"
  >;
}) {
  const { groupBy, limit, type, status, interval, start, end, timezone } =
    filters;

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
    ...(type && { type }),
    ...(status && { status }),
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

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
