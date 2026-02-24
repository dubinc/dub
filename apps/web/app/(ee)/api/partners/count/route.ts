import { getPartnersCount } from "@/lib/api/partners/get-partners-count";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { partnersCountQuerySchema } from "@/lib/zod/schemas/partners";
import { parseFilterValue } from "@dub/utils";
import { NextResponse } from "next/server";

function parsePartnerFilterParams(searchParams: Record<string, string | undefined>) {
  const partnerTagIdParsed = parseFilterValue(searchParams.partnerTagId);
  const groupIdParsed = parseFilterValue(searchParams.groupId);
  const countryParsed = parseFilterValue(searchParams.country);

  return {
    partnerTagId: partnerTagIdParsed?.values,
    partnerTagIdOperator: partnerTagIdParsed?.sqlOperator,
    groupId: groupIdParsed?.values?.[0],
    groupIdOperator: groupIdParsed?.sqlOperator,
    country: countryParsed?.values?.[0],
    countryOperator: countryParsed?.sqlOperator,
  };
}

// GET /api/partners/count - get the count of partners for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow({
      defaultProgramId: (workspace as { defaultProgramId?: string | null })
        .defaultProgramId,
    });
    const filterOverrides = parsePartnerFilterParams(searchParams);
    const parsedParams = partnersCountQuerySchema.parse(searchParams);

    const count = await getPartnersCount({
      ...parsedParams,
      partnerTagId: filterOverrides.partnerTagId ?? parsedParams.partnerTagId,
      partnerTagIdOperator: filterOverrides.partnerTagIdOperator,
      groupId: filterOverrides.groupId ?? parsedParams.groupId,
      groupIdOperator: filterOverrides.groupIdOperator,
      country: filterOverrides.country ?? parsedParams.country,
      countryOperator: filterOverrides.countryOperator,
      programId: programId as string,
    });

    return NextResponse.json(count);
  },
  {
    requiredPlan: [
      "business",
      "business extra",
      "business max",
      "business plus",
      "advanced",
      "enterprise",
    ],
  },
);
