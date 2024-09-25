import { VALID_ANALYTICS_ENDPOINTS } from "@/lib/analytics/constants";
import { getAnalytics } from "@/lib/analytics/get-analytics";
import { validDateRangeForPlan } from "@/lib/analytics/utils";
import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import { throwIfClicksUsageExceeded } from "@/lib/api/links/usage-checks";
import { withWorkspace } from "@/lib/auth";
import { getFolderOrThrow } from "@/lib/folder/get-folder";
import { getFolders } from "@/lib/folder/get-folders";
import {
  analyticsPathParamsSchema,
  analyticsQuerySchema,
} from "@/lib/zod/schemas/analytics";
import { Link } from "@prisma/client";
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
    let folderIds: string[] = [];

    event = oldEvent || event;
    groupBy = oldType || groupBy;

    if (domain) {
      await getDomainOrThrow({ workspace, domain });
    }

    if (linkId || externalId || (domain && key)) {
      link = await getLinkOrThrow({
        workspace: workspace,
        linkId,
        externalId,
        domain,
        key,
      });

      if (link.folderId) {
        await getFolderOrThrow({
          folderId: link.folderId,
          workspaceId: workspace.id,
          userId: session.user.id,
          requiredPermission: "folders.read",
        });
      }
    }

    if (folderId) {
      await getFolderOrThrow({
        workspaceId: workspace.id,
        userId: session.user.id,
        folderId,
        requiredPermission: "folders.read",
      });
    } else {
      const folders = await getFolders({
        workspaceId: workspace.id,
        userId: session.user.id,
      });

      folderIds = folders.map((folder) => folder.id);
    }

    validDateRangeForPlan({
      plan: workspace.plan,
      interval,
      start,
      end,
      throwError: true,
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
      folderIds: folderId ? [folderId] : folderIds,
    });

    return NextResponse.json(response);
  },
  {
    requiredPermissions: ["analytics.read"],
  },
);
