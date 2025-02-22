import { getAnalytics } from "@/lib/analytics/get-analytics";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId]/analytics – get analytics for a program enrollment link
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { program } = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId: params.programId,
    });

    const parsedParams = analyticsQuerySchema
      .omit({
        workspaceId: true,
        externalId: true,
        tenantId: true,
      })
      .parse(searchParams);

    const response = await getAnalytics({
      programId: program.id,
      partnerId: partner.id,
      ...parsedParams,
    });

    return NextResponse.json(response);
  },
);
