import { VALID_ANALYTICS_ENDPOINTS } from "@/lib/analytics/constants";
import { getAnalytics } from "@/lib/analytics/get-analytics";
import { getFolderIdsToFilter } from "@/lib/analytics/get-folder-ids-to-filter";
import { validDateRangeForPlan } from "@/lib/analytics/utils";
import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import { throwIfClicksUsageExceeded } from "@/lib/api/links/usage-checks";
import { withWorkspace } from "@/lib/auth";
import { verifyFolderAccess } from "@/lib/folder/permissions";
import {
  analyticsPathParamsSchema,
  analyticsQuerySchema,
} from "@/lib/zod/schemas/analytics";
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
    } = parsedParams;

    let link: Link | null = null;

    event = oldEvent || event;
    groupBy = oldType || groupBy;

    if (domain) {
      await getDomainOrThrow({ workspace, domain });
    }

    if (linkId || externalId || (domain && key)) {
      link = await getLinkOrThrow({
        workspaceId: workspace.id,
        linkId,
        externalId,
        domain,
        key,
      });
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

    const folderIds = folderIdToVerify
      ? undefined
      : await getFolderIdsToFilter({
          workspace,
          userId: session.user.id,
        });

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
      workspaceId: workspace.id,
      isDeprecatedClicksEndpoint,
      dataAvailableFrom: workspace.createdAt,
      folderIds,
      isMegaFolder: selectedFolder?.type === "mega",
    });

    return NextResponse.json(response);
  },
  {
    requiredPermissions: ["analytics.read"],
  },
);
