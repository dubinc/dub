import { VALID_ANALYTICS_ENDPOINTS } from "@/lib/analytics/constants";
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

    const parsedParams = partnerProfileAnalyticsQuerySchema.parse(searchParams);

    let { linkId, domain, key, ...rest } = parsedParams;

    if (linkId) {
      if (!links.some((link) => link.id === linkId)) {
        throw new DubApiError({
          code: "not_found",
          message: "Link not found",
        });
      }
    } else if (domain && key) {
      const foundLink = links.find(
        (link) => link.domain === domain && link.key === key,
      );
      if (!foundLink) {
        throw new DubApiError({
          code: "not_found",
          message: "Link not found",
        });
      }

      linkId = foundLink.id;
    }

    // Early return if there are no links and no linkId specified
    if (links.length === 0 && !linkId) {
      const zip = new JSZip();
      const zipData = await zip.generateAsync({ type: "nodebuffer" });
      return new Response(zipData as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": "attachment; filename=analytics_export.zip",
        },
      });
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
          ...rest,
          workspaceId: program.workspaceId,
          ...(linkId
            ? { linkId }
            : links.length > MAX_PARTNER_LINKS_FOR_LOCAL_FILTERING
              ? { partnerId: partner.id }
              : { linkIds: links.map((link) => link.id) }),
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
