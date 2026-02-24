import { getPartnersCount } from "@/lib/api/partners/get-partners-count";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { partnersCountQuerySchema } from "@/lib/zod/schemas/partners";
import { parseFilterValue } from "@dub/utils";
import { NextResponse } from "next/server";

function parsePartnerFilterParams(searchParams: Record<string, string | undefined>) {
  const partnerTagIdsParsed = parseFilterValue(searchParams.partnerTagIds);
  const groupIdParsed = parseFilterValue(searchParams.groupId);
  const countryParsed = parseFilterValue(searchParams.country);

  return {
    partnerTagIds: partnerTagIdsParsed?.values,
    partnerTagIdsOperator: partnerTagIdsParsed?.sqlOperator,
    groupId: groupIdParsed?.values?.[0],
    groupIdOperator: groupIdParsed?.sqlOperator,
    country: countryParsed?.values?.[0],
    countryOperator: countryParsed?.sqlOperator,
  };
}

// GET /api/partners/count - get the count of partners for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const filterOverrides = parsePartnerFilterParams(searchParams);
    const parsedParams = partnersCountQuerySchema.parse(searchParams);

    const count = await getPartnersCount({
      ...parsedParams,
      partnerTagIds: filterOverrides.partnerTagIds ?? parsedParams.partnerTagIds,
      partnerTagIdsOperator: filterOverrides.partnerTagIdsOperator,
      groupId: filterOverrides.groupId ?? parsedParams.groupId,
      groupIdOperator: filterOverrides.groupIdOperator,
      country: filterOverrides.country ?? parsedParams.country,
      countryOperator: filterOverrides.countryOperator,
      programId,
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
