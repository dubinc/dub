import { VALID_ANALYTICS_ENDPOINTS } from "@/lib/analytics/constants";
import { getAnalytics } from "@/lib/analytics/get-analytics";
import { getFolderIdsToFilter } from "@/lib/analytics/get-folder-ids-to-filter";
import { validDateRangeForPlan } from "@/lib/analytics/utils";
import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { DubApiError } from "@/lib/api/errors";
import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import { throwIfClicksUsageExceeded } from "@/lib/api/links/usage-checks";
import { checkIfLinksHaveFolders } from "@/lib/api/links/utils/check-if-links-have-folders";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { prefixWorkspaceId } from "@/lib/api/workspace-id";
import { withWorkspace } from "@/lib/auth";
import {
  checkFolderPermissions,
  verifyFolderAccess,
} from "@/lib/folder/permissions";
import {
  analyticsPathParamsSchema,
  analyticsQuerySchema,
} from "@/lib/zod/schemas/analytics";
import { prisma } from "@dub/prisma";
import { Folder, Link } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// GET /api/analytics – get analytics
export const GET = withWorkspace(
  async ({ params, searchParams, workspace, session }) => {
    throwIfClicksUsageExceeded(workspace);

    let { eventType: oldEvent, endpoint: oldType } =
      analyticsPathParamsSchema.parse(params);

    // for backwards compatibility (we used to support /analytics/[endpoint] as well)
    if (!oldType && oldEvent && VALID_ANALYTICS_ENDPOINTS.includes(oldEvent)) {
      oldType = oldEvent;
      oldEvent = undefined;
    }

    const parsedParams = analyticsQuerySchema.parse(searchParams);

    let {
      event,
      groupBy,
      interval,
      start,
      end,
      linkId,
      externalId,
      domain,
      key,
      folderId,
      programId,
      linkIds,
    } = parsedParams;

    event = oldEvent || event;
    groupBy = oldType || groupBy;

    if (programId) {
      const workspaceProgramId = getDefaultProgramIdOrThrow(workspace);
      if (programId !== workspaceProgramId) {
        throw new DubApiError({
          code: "forbidden",
          message: `Program ${programId} does not belong to workspace ${prefixWorkspaceId(workspace.id)}.`,
        });
      }
    }

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

          (folderIds || []).push(link.folderId);

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

    // no need to get folder ids if we are filtering by a folder or program
    if (!folderIds) {
      folderIds =
        folderIdToVerify || programId
          ? undefined
          : await getFolderIdsToFilter({
              workspace,
              userId: session.user.id,
            });
    }

    // Identify the request is from deprecated clicks endpoint
    // (/api/analytics/clicks)
    // (/api/analytics/count)
    // (/api/analytics/clicks/clicks)
    // (/api/analytics/clicks/count)
    const isDeprecatedClicksEndpoint =
      oldEvent === "clicks" || oldType === "count";

    const response = await getAnalytics({
      ...parsedParams,
      event,
      groupBy,
      ...(link && { linkId: link.id }),
      folderIds,
      isMegaFolder: selectedFolder?.type === "mega",
      workspaceId: workspace.id,
      isDeprecatedClicksEndpoint,
      // dataAvailableFrom is only relevant for timeseries groupBy
      ...(groupBy === "timeseries" && {
        dataAvailableFrom: workspace.createdAt,
      }),
    });

    return NextResponse.json(response);
  },
  {
    requiredPermissions: ["analytics.read"],
  },
);
