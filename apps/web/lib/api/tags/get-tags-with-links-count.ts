import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";

type GetTagsWithLinksCountParams = {
  workspaceId: string;
  search?: string;
  ids?: string[];
  sortBy: "name" | "createdAt";
  sortOrder: "asc" | "desc";
  page: number;
  pageSize: number;
};

/**
 * Tags for a workspace with per-tag link counts. Uses Tag ⋈ LinkTag after filtering
 * by projectId so we never aggregate the full LinkTag table (unlike Prisma's default
 * _count plan for this relation on PlanetScale/MySQL at large scale).
 */
export async function getTagsWithLinksCount(
  params: GetTagsWithLinksCountParams,
) {
  const { workspaceId, search, ids, sortBy, sortOrder, page, pageSize } =
    params;
  const skip = (page - 1) * pageSize;

  const conditions: Prisma.Sql[] = [Prisma.sql`t.projectId = ${workspaceId}`];

  if (search) {
    conditions.push(Prisma.sql`t.name LIKE ${`%${search}%`}`);
  }
  if (ids?.length) {
    conditions.push(Prisma.sql`t.id IN (${Prisma.join(ids)})`);
  }

  const whereClause = Prisma.join(conditions, " AND ");

  const orderByClause =
    sortBy === "createdAt"
      ? sortOrder === "desc"
        ? "t.createdAt DESC"
        : "t.createdAt ASC"
      : sortOrder === "desc"
        ? "t.name DESC"
        : "t.name ASC";

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      color: string;
      link_count: bigint | number;
    }>
  >(Prisma.sql`
    SELECT
      t.id,
      t.name,
      t.color,
      COUNT(lt.id) AS link_count
    FROM Tag t
    LEFT JOIN LinkTag lt ON lt.tagId = t.id
    WHERE ${whereClause}
    GROUP BY t.id, t.name, t.color
    ORDER BY ${Prisma.raw(orderByClause)}
    LIMIT ${pageSize} OFFSET ${skip}
  `);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    _count: {
      links: Number(row.link_count),
    },
  }));
}
