import { getAnalytics } from "@/lib/analytics/get-analytics";
import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { ratelimit } from "@/lib/upstash";
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

    const { success } = await ratelimit(
      program.id === "prog_1K0QHV7MP3PR05CJSCF5VN93X" ? 5 : 60,
      program.id === "prog_1K0QHV7MP3PR05CJSCF5VN93X" ? "30 m" : "1 h",
    ).limit(`partnerProgramEvents:${partner.id}:${program.id}`);

    if (!success) {
      throw new DubApiError({
        code: "rate_limit_exceeded",
        message: "You have been rate limited. Please try again later.",
      });
    }

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
      ...rest,
      ...(linkId ? { linkId } : { linkIds: links.map((link) => link.id) }),
      dataAvailableFrom: program.startedAt ?? program.createdAt,
    });

    return NextResponse.json(response);
  },
);
