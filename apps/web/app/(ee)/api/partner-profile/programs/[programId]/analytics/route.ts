import { getAnalytics } from "@/lib/analytics/get-analytics";
import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { partnerProfileAnalyticsQuerySchema } from "@/lib/zod/schemas/partner-profile";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId]/analytics – get analytics for a program enrollment link
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { program, links } = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId: params.programId,
      include: {
        program: true,
        links: true,
      },
    });

    let { linkId, domain, key, ...rest } =
      partnerProfileAnalyticsQuerySchema.parse(searchParams);

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

    const response = await getAnalytics({
      ...(program.id === "prog_1K0QHV7MP3PR05CJSCF5VN93X"
        ? { event: rest.event, groupBy: "count", interval: "all" }
        : rest),
      ...(linkId ? { linkId } : { linkIds: links.map((link) => link.id) }),
      dataAvailableFrom: program.startedAt ?? program.createdAt,
    });

    return NextResponse.json(response);
  },
);
