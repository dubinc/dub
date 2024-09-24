import { INTERVAL_DATA } from "@/lib/analytics/constants";
import { convertToCSV } from "@/lib/analytics/utils";
import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { throwIfClicksUsageExceeded } from "@/lib/api/links/usage-checks";
import { withWorkspace } from "@/lib/auth";
import { getFolderWithUser } from "@/lib/link-folder/get-folder";
import { getFolders } from "@/lib/link-folder/get-folders";
import { throwIfFolderActionDenied } from "@/lib/link-folder/permissions";
import { prisma } from "@/lib/prisma";
import { linksExportQuerySchema } from "@/lib/zod/schemas/links";
import { linkConstructor } from "@dub/utils";

// GET /api/links/export – export links to CSV
export const GET = withWorkspace(
  async ({ searchParams, workspace, session }) => {
    throwIfClicksUsageExceeded(workspace);

    const {
      domain,
      tagIds,
      search,
      sort,
      userId,
      showArchived,
      withTags,
      start,
      end,
      interval,
      columns,
      folderId,
    } = linksExportQuerySchema.parse(searchParams);

    if (domain) {
      await getDomainOrThrow({ workspace, domain });
    }

    if (folderId) {
      const { folder, folderUser } = await getFolderWithUser({
        folderId,
        workspaceId: workspace.id,
        userId: session.user.id,
      });

      throwIfFolderActionDenied({
        folder,
        folderUser,
        requiredPermission: "folders.read",
      });
    }

    const folders = await getFolders({
      workspaceId: workspace.id,
      userId: session.user.id,
    });

    const folderIds = folders.map((folder) => folder.id);

    const links = await prisma.link.findMany({
      select: {
        id: columns.includes("id"),
        domain: columns.includes("link"),
        key: columns.includes("link"),
        url: columns.includes("url"),
        clicks: columns.includes("clicks"),
        createdAt: columns.includes("createdAt"),
        updatedAt: columns.includes("updatedAt"),
        ...(columns.includes("tags") && {
          tags: {
            select: {
              tag: {
                select: {
                  name: true,
                },
              },
            },
          },
        }),
        archived: columns.includes("archived"),
      },
      where: {
        projectId: workspace.id,
        archived: showArchived ? undefined : false,
        createdAt: {
          gte: start ?? INTERVAL_DATA[interval ?? "all"].startDate,
          lte: end ?? new Date(),
        },
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
        ...(tagIds &&
          tagIds.length > 0 && {
            tags: { some: { tagId: { in: tagIds } } },
          }),
        ...(userId && { userId }),
        ...(folderId && { folderId }),
        OR: [{ folderId: { in: folderIds } }, { folderId: null }],
      },
      orderBy: {
        [sort]: "desc",
      },
    });

    const csvData = convertToCSV(
      links.map((link) => {
        // Use a Map to maintain order of keys
        let result = new Map([
          ...(columns.includes("link")
            ? [
                [
                  "link",
                  linkConstructor({ domain: link.domain, key: link.key }),
                ] as [string, string],
              ]
            : []),
          ...Object.entries(link),
        ]);

        if (columns.includes("link")) {
          result.delete("domain");
          result.delete("key");
        }

        if (columns.includes("tags")) {
          result.set(
            "tags",
            link.tags.map((tag) => (tag as any).tag.name).join(", "),
          );
        }

        return Object.fromEntries(result.entries());
      }),
    );

    return new Response(csvData, {
      headers: {
        "Content-Type": "application/csv",
        "Content-Disposition": `attachment; filename=links_export.csv`,
      },
    });
  },
  {
    requiredPermissions: ["links.read"],
  },
);
