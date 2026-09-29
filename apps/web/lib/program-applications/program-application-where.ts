import { getProgramApplicationsCountQuerySchema } from "@/lib/zod/schemas/program-application";
import { parseFilterValue } from "@dub/utils";
import { Prisma, ProgramEnrollmentStatus } from "@prisma/client";
import * as z from "zod/v4";

function applicationFieldFilter(
  value?: string,
): Prisma.StringNullableFilter | undefined {
  const parsed = parseFilterValue(value);

  if (!parsed?.values.length) {
    return undefined;
  }

  return parsed.sqlOperator === "NOT IN"
    ? { notIn: parsed.values }
    : { in: parsed.values };
}

type ProgramApplicationWhereParams = z.infer<
  typeof getProgramApplicationsCountQuerySchema
> & {
  programId: string;
};

export function buildProgramApplicationWhere({
  programId,
  groupId,
  country,
  status = ProgramEnrollmentStatus.pending,
  search,
}: ProgramApplicationWhereParams): Prisma.ProgramApplicationWhereInput {
  const query = search?.trim();
  const groupIdFilter = applicationFieldFilter(groupId);
  const countryFilter = applicationFieldFilter(country);

  return {
    programId,
    enrollment: {
      status,
    },
    ...(groupIdFilter && { groupId: groupIdFilter }),
    ...(countryFilter && { country: countryFilter }),
    ...(query && {
      OR: [{ name: { contains: query } }, { email: { contains: query } }],
    }),
  };
}
