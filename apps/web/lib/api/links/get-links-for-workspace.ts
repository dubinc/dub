import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { getLinksQuerySchemaExtended } from "@/lib/zod/schemas/links";
import { combineTagIds, transformLink } from "./utils";

export async function getLinksForWorkspace({
  workspaceId,
  domain,
  tagId,
  tagIds,
  tagNames,
  folderIds,
  search,
  sort = "createdAt",
  page,
  pageSize,
  userId,
  showArchived,
  withTags,
  includeUser,
}: z.infer<typeof getLinksQuerySchemaExtended> & {
  workspaceId: string;
}) {
  const combinedTagIds = combineTagIds({ tagId, tagIds });

  const links = await prisma.link.findMany({
    where: {
      projectId: workspaceId,
      archived: showArchived ? undefined : false,
      ...(domain && { domain }),
      ...(search && {
        OR: [
          {
            key: { contains: search },
          },
          {
            url: { contains: search },
          },
        ],
      }),
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
      ...(userId && { userId }),

      // Filter by folderId
      ...(folderIds && folderIds.length > 0
        ? {
            folderId: { in: folderIds },
          }
        : {}),
    },
    include: {
      user: includeUser,
      tags: {
        include: {
          tag: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      },
    },
    orderBy: {
      [sort]: "desc",
    },
    take: pageSize,
    ...(page && {
      skip: (page - 1) * pageSize,
    }),
  });

  return links.map((link) => transformLink(link));
}
