import { getFirstFilterValue } from "@/lib/analytics/filter-helpers";
import { getAnalytics } from "@/lib/analytics/get-analytics";
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
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId]/analytics – get analytics for a program enrollment link
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

    // early return if partner has no links
    if (links.length === 0) {
      return NextResponse.json([], { status: 200 });
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
          return NextResponse.json([], { status: 200 });
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

    const response = await getAnalytics({
      ...(LARGE_PROGRAM_IDS.includes(program.id) &&
      totalCommissions < LARGE_PROGRAM_MIN_TOTAL_COMMISSIONS_CENTS
        ? { event: parsedParams.event, groupBy: "count", interval: "all" }
        : parsedParams),
      workspaceId: program.workspaceId,
      ...(parsedParams.linkId
        ? { linkId: parsedParams.linkId }
        : links.length > MAX_PARTNER_LINKS_FOR_LOCAL_FILTERING
          ? { partnerId: partner.id }
          : { linkId: parseFilterValue(links.map((link) => link.id)) }),
      dataAvailableFrom: program.startedAt ?? program.createdAt,
    });

    return NextResponse.json(response);
  },
);
