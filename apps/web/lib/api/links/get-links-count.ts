import { combineTagIds } from "@/lib/api/tags/combine-tag-ids";
import z from "@/lib/zod";
import { getLinksCountQuerySchema } from "@/lib/zod/schemas/links";
import { prisma } from "@dub/prisma";

export async function getLinksCount({
  searchParams,
  workspaceId,
  folderIds,
}: {
  searchParams: z.infer<typeof getLinksCountQuerySchema>;
  workspaceId: string;
  folderIds?: string[];
}) {
  const {
    groupBy,
    search,
    domain,
    tagId,
    tagIds,
    tagNames,
    userId,
    showArchived,
    withTags,
    folderId,
    tenantId,
  } = searchParams;

  const combinedTagIds = combineTagIds({ tagId, tagIds });

  const linksWhere = {
    projectId: workspaceId,
    archived: showArchived ? undefined : false,
    AND: [
      ...(folderIds
        ? [
            {
              OR: [
                {
                  folderId: {
                    in: folderIds,
                  },
                },
                {
                  folderId: null,
                },
              ],
            },
          ]
        : [
            {
              folderId: folderId || null,
            },
          ]),
      ...(search
        ? [
            {
              OR: [
                { shortLink: { contains: search } },
                { url: { contains: search } },
              ],
            },
          ]
        : []),
    ],
    ...(domain &&
      groupBy !== "domain" && {
        domain,
      }),
    ...(userId &&
      groupBy !== "userId" && {
        userId,
      }),
    ...(tenantId && { tenantId }),
  };

  if (groupBy === "tagId") {
    return await prisma.linkTag.groupBy({
      by: ["tagId"],
      where: {
        link: linksWhere,
      },
      _count: true,
      orderBy: {
        _count: {
          tagId: "desc",
        },
      },
    });
  } else {
    const where = {
      ...linksWhere,
      ...(withTags && {
        tags: {
          some: {},
        },
      }),
      ...(combinedTagIds && combinedTagIds.length > 0
        ? {
            tags: { some: { tagId: { in: combinedTagIds } } },
          }
        : tagNames
          ? {
              tags: {
                some: {
                  tag: {
                    name: {
                      in: tagNames,
                    },
                  },
                },
              },
            }
          : {}),
    };

    if (
      groupBy === "domain" ||
      groupBy === "userId" ||
      groupBy === "folderId"
    ) {
      return await prisma.link.groupBy({
        by: [groupBy],
        where,
        _count: true,
        orderBy: {
          _count: {
            [groupBy]: "desc",
          },
        },
      });
    } else {
      return await prisma.link.count({
        where,
      });
    }
  }
}
