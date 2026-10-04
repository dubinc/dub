import { isExactPartnerIdQuery } from "@/lib/api/partners/program-enrollment-query";
import { prisma, sanitizeFullTextSearch } from "@/lib/prisma";
import { getProgramApplicationsCountQuerySchema } from "@/lib/zod/schemas/program-application";
import { parseFilterValue } from "@dub/utils";
import { Prisma, ProgramApplicationStatus } from "@prisma/client";
import * as z from "zod/v4";
import { buildProgramApplicationWhere } from "./program-application-where";

type CountProgramApplicationsParams = z.infer<
  typeof getProgramApplicationsCountQuerySchema
> & {
  programId: string;
};

export async function countProgramApplications({
  programId,
  groupId,
  country,
  status,
  search,
  groupBy,
}: CountProgramApplicationsParams) {
  if (groupBy === "country") {
    return byPartnerCountry({
      programId,
      groupId,
      status,
      search,
    });
  }

  const where = buildProgramApplicationWhere({
    programId,
    groupId: groupBy === "groupId" ? undefined : groupId,
    country,
    status,
    search,
  });

  // Find the count of program applications by groupId
  if (groupBy === "groupId") {
    return prisma.programApplication.groupBy({
      by: ["groupId"],
      where,
      _count: true,
      orderBy: {
        _count: {
          groupId: "desc",
        },
      },
    });
  }

  // Find the absolute count of program applications
  return prisma.programApplication.count({
    where,
  });
}

type PartnerCountryCountRow = {
  country: string | null;
  _count: bigint;
};

async function byPartnerCountry({
  programId,
  groupId,
  status = ProgramApplicationStatus.pending,
  search,
}: Pick<
  CountProgramApplicationsParams,
  "programId" | "groupId" | "status" | "search"
>) {
  const rows = await prisma.$queryRaw<PartnerCountryCountRow[]>(Prisma.sql`
    SELECT
      p.country AS country,
      COUNT(*) AS _count
    FROM ProgramApplication pa
    INNER JOIN Partner p ON p.id = pa.partnerId
    WHERE pa.programId = ${programId}
      AND pa.status = ${status} ${groupIdSql(groupId)} ${searchSql(search)}
    GROUP BY p.country
    ORDER BY _count DESC
  `);

  return rows.map((row) => ({
    country: row.country,
    _count: Number(row._count),
  }));
}

// Include or exclude applications in the given groups.
function groupIdSql(groupId?: string) {
  const parsed = parseFilterValue(groupId);

  if (!parsed?.values.length) {
    return Prisma.sql``;
  }

  const ids = Prisma.join(parsed.values);

  return parsed.sqlOperator === "NOT IN"
    ? Prisma.sql`AND pa.groupId NOT IN (${ids})`
    : Prisma.sql`AND pa.groupId IN (${ids})`;
}

// Match an exact partner ID, or a name, email, or company search.
function searchSql(search?: string) {
  const query = search?.trim();

  if (!query) {
    return Prisma.sql``;
  }

  if (isExactPartnerIdQuery(query)) {
    return Prisma.sql`AND pa.partnerId = ${query}`;
  }

  const like = `%${query}%`;
  const fullTextQuery = sanitizeFullTextSearch(query);

  if (!fullTextQuery) {
    return Prisma.sql`AND (pa.name LIKE ${like} OR pa.email LIKE ${like})`;
  }

  return Prisma.sql`
    AND (
      pa.name LIKE ${like}
      OR pa.email LIKE ${like}
      OR MATCH(p.email, p.name, p.companyName) AGAINST (${fullTextQuery} IN NATURAL LANGUAGE MODE)
    )
  `;
}
