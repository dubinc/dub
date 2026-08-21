import {
  exportAnalyticsToZip,
  PARTNER_PROFILE_SKIP_ENDPOINTS,
} from "@/lib/analytics/export-analytics-to-zip";
import {
  getFirstFilterValue,
  hasExactlyOneLinkIdFilter,
} from "@/lib/analytics/filter-helpers";
import { formatPartnerAnalyticsForExport } from "@/lib/analytics/utils/format-analytics-export";
import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import {
  LARGE_PROGRAM_IDS,
  LARGE_PROGRAM_MIN_TOTAL_COMMISSIONS_CENTS,
  MAX_PARTNER_LINKS_FOR_LOCAL_FILTERING,
} from "@/lib/constants/partner-profile";
import { ratelimit } from "@/lib/upstash";
import { partnerProfileAnalyticsQuerySchema } from "@/lib/zod/schemas/partner-profile";
import { parseFilterValue, toCentsNumber } from "@dub/utils";

export const maxDuration = 300;

// GET /api/partner-profile/programs/[programId]/analytics/export – get export data for partner profile analytics
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { success } = await ratelimit(1, "30 s").limit(
      `analyticsExport:partner:${partner.id}:${params.programId}`,
    );

    if (!success) {
      throw new DubApiError({
        code: "rate_limit_exceeded",
        message:
          "Analytics export is limited to once every 30 seconds. Please try again shortly.",
      });
    }

    const { program, links, totalCommissions } =
      await getProgramEnrollmentOrThrow({
        partnerId: partner.id,
        programId: params.programId,
        include: {
          program: true,
          links: true,
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

    if (links.length === 0) {
      throw new DubApiError({
        code: "not_found",
        message: "No links found",
      });
    }

    const parsedParams = partnerProfileAnalyticsQuerySchema.parse(searchParams);

    const { linkId, domain, key } = parsedParams;

    if (linkId) {
      if (
        !linkId.values.every((value) => links.some((link) => link.id === value))
      ) {
        throw new DubApiError({
          code: "not_found",
          message: "One or more links are not found",
        });
      }

      if (linkId.sqlOperator === "NOT IN") {
        const finalIncludedLinkIds = links
          .filter((link) => !linkId.values.includes(link.id))
          .map((link) => link.id);

        if (finalIncludedLinkIds.length === 0) {
          throw new DubApiError({
            code: "not_found",
            message: "No links found",
          });
        }

        parsedParams.linkId = {
          operator: "IS",
          sqlOperator: "IN",
          values: finalIncludedLinkIds,
        };
      }
    } else if (domain && key) {
      const link = links.find(
        (link) =>
          link.domain === getFirstFilterValue(domain) && link.key === key,
      );
      if (!link) {
        throw new DubApiError({
          code: "not_found",
          message: "Link not found",
        });
      }

      parsedParams.linkId = {
        operator: "IS",
        sqlOperator: "IN",
        values: [link.id],
      };
    }

    const dataAvailableFrom = program.startedAt ?? program.createdAt;

    const zipData = await exportAnalyticsToZip({
      params: parsedParams,
      workspaceId: program.workspaceId,
      useComposite: true,
      skipEndpoints: PARTNER_PROFILE_SKIP_ENDPOINTS,
      skipTopLinksForSingleLink: hasExactlyOneLinkIdFilter(parsedParams.linkId),
      formatRows: formatPartnerAnalyticsForExport,
      getAnalyticsParams: () =>
        parsedParams.linkId
          ? { linkId: parsedParams.linkId }
          : links.length > MAX_PARTNER_LINKS_FOR_LOCAL_FILTERING
            ? { partnerId: partner.id }
            : { linkId: parseFilterValue(links.map((link) => link.id)) },
      getDataAvailableFrom: () => dataAvailableFrom,
    });

    return new Response(zipData as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=analytics_export.zip",
      },
    });
  },
);
