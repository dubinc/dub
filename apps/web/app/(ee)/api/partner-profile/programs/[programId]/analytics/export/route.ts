import { VALID_ANALYTICS_ENDPOINTS } from "@/lib/analytics/constants";
import { getFirstFilterValue } from "@/lib/analytics/filter-helpers";
import { getAnalytics } from "@/lib/analytics/get-analytics";
import { convertToCSV } from "@/lib/analytics/utils";
import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import {
  LARGE_PROGRAM_IDS,
  LARGE_PROGRAM_MIN_TOTAL_COMMISSIONS_CENTS,
  MAX_PARTNER_LINKS_FOR_LOCAL_FILTERING,
} from "@/lib/constants/partner-profile";
import { partnerProfileAnalyticsQuerySchema } from "@/lib/zod/schemas/partner-profile";
import { parseFilterValue } from "@dub/utils";
import JSZip from "jszip";

// GET /api/partner-profile/programs/[programId]/analytics/export – get export data for partner profile analytics
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
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
      totalCommissions < LARGE_PROGRAM_MIN_TOTAL_COMMISSIONS_CENTS
    ) {
      throw new DubApiError({
        code: "forbidden",
        message: "This feature is not available for your program.",
      });
    }

    // Early return if partner has no links
    if (links.length === 0) {
      throw new DubApiError({
        code: "not_found",
        message: "No links found",
      });
    }

    const parsedParams = partnerProfileAnalyticsQuerySchema.parse(searchParams);

    const { linkId, domain, key } = parsedParams;

    if (linkId) {
      // check to make sure all of the linkId.values are in the links
      if (
        !linkId.values.every((value) => links.some((link) => link.id === value))
      ) {
        throw new DubApiError({
          code: "not_found",
          message: "One or more links are not found",
        });
      }

      if (linkId.sqlOperator === "NOT IN") {
        // if using NOT IN operator, we need to include all links except the ones in the linkId.values
        const finalIncludedLinkIds = links
          .filter((link) => !linkId.values.includes(link.id))
          .map((link) => link.id);

        // early return if no links are left
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

    const zip = new JSZip();

    await Promise.all(
      VALID_ANALYTICS_ENDPOINTS.map(async (endpoint) => {
        // no need to fetch top links data if there's a link specified
        // since this is just a single link
        if (endpoint === "top_links" && linkId) return;
        // skip clicks count
        if (endpoint === "count") return;

        const response = await getAnalytics({
          ...parsedParams,
          workspaceId: program.workspaceId,
          ...(parsedParams.linkId
            ? { linkId: parsedParams.linkId }
            : links.length > MAX_PARTNER_LINKS_FOR_LOCAL_FILTERING
              ? { partnerId: partner.id }
              : { linkId: parseFilterValue(links.map((link) => link.id)) }),
          dataAvailableFrom: program.startedAt ?? program.createdAt,
          groupBy: endpoint,
        });

        if (!response || response.length === 0) return;

        const csvData = convertToCSV(response);
        zip.file(`${endpoint}.csv`, csvData);
      }),
    );

    const zipData = await zip.generateAsync({ type: "nodebuffer" });

    return new Response(zipData as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=analytics_export.zip",
      },
    });
  },
);
