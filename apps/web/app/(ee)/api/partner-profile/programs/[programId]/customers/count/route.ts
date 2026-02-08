import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import {
  LARGE_PROGRAM_IDS,
  LARGE_PROGRAM_MIN_TOTAL_COMMISSIONS_CENTS,
} from "@/lib/constants/partner-profile";
import { getPartnerCustomersCountQuerySchema } from "@/lib/zod/schemas/partner-profile";
import { prisma, sanitizeFullTextSearch } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/:programId/customers/count – Get customer counts grouped by a field
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { programId } = params;
    const { search, country, linkId, groupBy } =
      getPartnerCustomersCountQuerySchema.parse(searchParams);

    const { program, totalCommissions, customerDataSharingEnabledAt } =
      await getProgramEnrollmentOrThrow({
        partnerId: partner.id,
        programId: programId,
        include: {
          program: true,
        },
      });

    if (
      LARGE_PROGRAM_IDS.includes(program.id) &&
      totalCommissions < LARGE_PROGRAM_MIN_TOTAL_COMMISSIONS_CENTS
    ) {
      throw new DubApiError({
        code: "forbidden",
        message: "This feature is not available for your program.",
      });
    }

    const commonWhere: Prisma.CustomerWhereInput = {
      partnerId: partner.id,
      programId: program.id,
      projectId: program.workspaceId,
      // Only filter by country if not grouping by country
      ...(country &&
        groupBy !== "country" && {
          country,
        }),
      // Only filter by linkId if not grouping by linkId
      ...(linkId &&
        groupBy !== "linkId" && {
          linkId,
        }),
      // Only allow search if customer data sharing is enabled
      ...(search && customerDataSharingEnabledAt
        ? search.includes("@")
          ? { email: search }
          : {
              email: { search: sanitizeFullTextSearch(search) },
              name: { search: sanitizeFullTextSearch(search) },
            }
        : {}),
    };

    // Get customer count by country
    if (groupBy === "country") {
      const data = await prisma.customer.groupBy({
        by: ["country"],
        where: { ...commonWhere, country: { not: null } },
        _count: true,
        orderBy: {
          _count: {
            country: "desc",
          },
        },
      });

      return NextResponse.json(data);
    }

    // Get customer count by linkId
    if (groupBy === "linkId") {
      const data = await prisma.customer.groupBy({
        by: ["linkId"],
        where: { ...commonWhere, linkId: { not: null } },
        _count: true,
        orderBy: {
          _count: {
            linkId: "desc",
          },
        },
        take: 10000,
      });

      const links = await prisma.link.findMany({
        where: {
          id: { in: data.map(({ linkId }) => linkId!) },
        },
        select: {
          id: true,
          domain: true,
          key: true,
          shortLink: true,
          url: true,
        },
      });

      const enrichedData = data
        .map((d) => {
          const link = links.find(({ id }) => id === d.linkId);
          if (!link) return null;
          return {
            ...d,
            domain: link.domain,
            key: link.key,
            shortLink: link.shortLink,
            url: link.url,
          };
        })
        .filter(Boolean);

      return NextResponse.json(enrichedData);
    }

    // If no groupBy, return total count
    const count = await prisma.customer.count({
      where: commonWhere,
    });

    return NextResponse.json(count);
  },
);
