import { getEvents } from "@/lib/analytics/get-events";
import { getFolderIdsToFilter } from "@/lib/analytics/get-folder-ids-to-filter";
import { validDateRangeForPlan } from "@/lib/analytics/utils";
import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import { throwIfClicksUsageExceeded } from "@/lib/api/links/usage-checks";
import { checkIfLinksHaveFolders } from "@/lib/api/links/utils/check-if-links-have-folders";
import { withWorkspace } from "@/lib/auth";
import {
  checkFolderPermissions,
  verifyFolderAccess,
} from "@/lib/folder/permissions";
import { eventsQuerySchema } from "@/lib/zod/schemas/analytics";
import { prisma } from "@dub/prisma";
import { Folder, Link } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// GET /api/events
export const GET = withWorkspace(
  async ({ searchParams, workspace, session }) => {
    throwIfClicksUsageExceeded(workspace);

    const parsedParams = eventsQuerySchema.parse(searchParams);

    let {
      event,
      interval,
      start,
      end,
      linkId,
      externalId,
      domain,
      key,
      folderId,
      linkIds,
    } = parsedParams;

    if (domain) {
      await getDomainOrThrow({ workspace, domain });
    }

    let link: Link | null = null;
    let links: Link[] = [];
    let folderIds: string[] | undefined = undefined;

    if (linkId || externalId || (domain && key)) {
      link = await getLinkOrThrow({
        workspaceId: workspace.id,
        linkId,
        externalId,
        domain,
        key,
      });
    }

    // if linkIds are provided
    // 1. Check if the links are valid
    // 2. Check if the user has access to the folders the links are in
    if (linkIds && linkIds.length) {
      links = await prisma.link.findMany({
        where: {
          id: {
            in: linkIds,
          },
          programId: workspace.id,
        },
      });

      if (checkIfLinksHaveFolders(links)) {
        const linkFolderIds = Array.from(
          new Set(
            links.map((link) => link.folderId).filter(Boolean) as string[],
          ),
        );

        const folderPermissions = await checkFolderPermissions({
          workspaceId: workspace.id,
          userId: session.user.id,
          folderIds: linkFolderIds,
          requiredPermission: "folders.read",
        });

        links = links.filter((link) => {
          if (!link.folderId) {
            return true;
          }

          const validFolder = folderPermissions.find(
            (folder) => folder.folderId === link.folderId,
          );

          if (!validFolder?.hasPermission) {
            return false;
          }

          folderIds?.push(link.folderId);

          return true;
        });
      }
    }

    const folderIdToVerify = link?.folderId || folderId;
    let selectedFolder: Pick<Folder, "id" | "type"> | null = null;

    if (folderIdToVerify) {
      selectedFolder = await verifyFolderAccess({
        workspace,
        userId: session.user.id,
        folderId: folderIdToVerify,
        requiredPermission: "folders.read",
      });
    }

    validDateRangeForPlan({
      plan: workspace.plan,
      dataAvailableFrom: workspace.createdAt,
      interval,
      start,
      end,
      throwError: true,
    });

    if (!folderIds) {
      folderIds = folderIdToVerify
        ? undefined
        : await getFolderIdsToFilter({
            workspace,
            userId: session.user.id,
          });
    }

    const response = await getEvents({
      ...parsedParams,
      event,
      ...(link && { linkId: link.id }),
      workspaceId: workspace.id,
      folderIds,
      folderId: folderId || "",
      isMegaFolder: selectedFolder?.type === "mega",
    });

    return NextResponse.json(response);
  },
  {
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
    requiredPermissions: ["analytics.read"],
  },
);
