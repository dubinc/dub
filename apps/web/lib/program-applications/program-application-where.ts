import { isExactPartnerIdQuery } from "@/lib/api/partners/program-enrollment-query";
import { sanitizeFullTextSearch } from "@/lib/prisma";
import { getProgramApplicationsCountQuerySchema } from "@/lib/zod/schemas/program-application";
import { parseFilterValue } from "@dub/utils";
import {
  Prisma,
  ProgramApplicationStatus,
  ProgramEnrollmentStatus,
} from "@prisma/client";
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

type ProgramApplicationWhereParams = Omit<
  z.infer<typeof getProgramApplicationsCountQuerySchema>,
  "groupBy"
> & {
  programId: string;
};

function buildSearchWhere(query: string): Prisma.ProgramApplicationWhereInput {
  if (isExactPartnerIdQuery(query)) {
    return {
      partnerId: query,
    };
  }

  const fullTextQuery = sanitizeFullTextSearch(query);

  return {
    OR: [
      { name: { contains: query } },
      { email: { contains: query } },
      ...(fullTextQuery
        ? [
            {
              partner: {
                OR: [
                  { email: { search: fullTextQuery } },
                  { name: { search: fullTextQuery } },
                  { companyName: { search: fullTextQuery } },
                ],
              },
            },
          ]
        : []),
    ],
  };
}

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

  // The query schema accepts enrollment statuses (pending | rejected), so map
  // them onto the application's own status. Approved applications are never listed.
  const applicationStatus =
    status === ProgramEnrollmentStatus.rejected
      ? ProgramApplicationStatus.rejected
      : ProgramApplicationStatus.pending;

  return {
    programId,
    status: applicationStatus,
    partnerId: { not: null },
    ...(groupIdFilter && { groupId: groupIdFilter }),
    ...(countryFilter && { country: countryFilter }),
    ...(query ? buildSearchWhere(query) : {}),
  };
}
