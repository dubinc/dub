import { convertToCSV } from "@/lib/analytics/utils";
import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import {
  CUSTOMER_LTV_EXCLUDED_PROGRAM_IDS,
  LARGE_PROGRAM_IDS,
  LARGE_PROGRAM_MIN_TOTAL_COMMISSIONS_CENTS,
} from "@/lib/constants/partner-profile";
import { qstash } from "@/lib/cron";
import { formatPartnerCustomersForExport } from "@/lib/customers/api/format-partner-customers-export";
import { prisma, sanitizeFullTextSearch } from "@/lib/prisma";
import { partnerCustomersExportQuerySchema } from "@/lib/zod/schemas/partner-profile";
import { APP_DOMAIN_WITH_NGROK, toCentsNumber } from "@dub/utils";
import { CommissionType } from "@prisma/client";
import { NextResponse } from "next/server";

const MAX_CUSTOMERS_TO_EXPORT = 1000;

// GET /api/partner-profile/programs/[programId]/customers/export – export partner customers to CSV
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams, session }) => {
    const filters = partnerCustomersExportQuerySchema.parse(searchParams);
    const { search, country, linkId, sortBy, sortOrder, columns } = filters;

    const { program, totalCommissions, customerDataSharingEnabledAt } =
      await getProgramEnrollmentOrThrow({
        partnerId: partner.id,
        programId: params.programId,
        include: {
          program: true,
        },
      });

    if (
      LARGE_PROGRAM_IDS.includes(program.id) &&
      toCentsNumber(totalCommissions) <
        LARGE_PROGRAM_MIN_TOTAL_COMMISSIONS_CENTS
    ) {
      throw new DubApiError({
        code: "forbidden",
        message: "This feature is not available for your program.",
      });
    }

    const ltvExcluded = CUSTOMER_LTV_EXCLUDED_PROGRAM_IDS.includes(program.id);

    if (sortBy === "saleAmount" && ltvExcluded) {
      throw new DubApiError({
        code: "bad_request",
        message: "This feature is not available for your program.",
      });
    }

    const where = {
      partnerId: partner.id,
      programId: program.id,
      projectId: program.workspaceId,
      ...(country && { country }),
      ...(linkId && { linkId }),
      ...(search && customerDataSharingEnabledAt
        ? search.includes("@")
          ? { email: search }
          : {
              email: { search: sanitizeFullTextSearch(search) },
              name: { search: sanitizeFullTextSearch(search) },
            }
        : {}),
    };

    const count = await prisma.customer.count({ where });

    if (count > MAX_CUSTOMERS_TO_EXPORT) {
      await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/export/customers/partner`,
        body: {
          ...filters,
          partnerId: partner.id,
          programId: program.id,
          userId: session.user.id,
          columns: columns.join(","),
        },
      });

      return NextResponse.json({}, { status: 202 });
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        link: true,
        commissions: {
          where: {
            partnerId: partner.id,
            type: CommissionType.sale,
          },
          take: 1,
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      take: MAX_CUSTOMERS_TO_EXPORT,
    });

    const rows = formatPartnerCustomersForExport(customers, columns, {
      customerDataSharingEnabledAt,
      ltvExcluded,
    });

    return new Response(convertToCSV(rows), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment",
      },
    });
  },
);
