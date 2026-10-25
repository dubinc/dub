import { VALID_ANALYTICS_ENDPOINTS } from "@/lib/analytics/constants";
import { getFirstFilterValue } from "@/lib/analytics/filter-helpers";
import { getAnalytics } from "@/lib/analytics/get-analytics";
import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import { throwIfClicksUsageExceeded } from "@/lib/api/links/usage-checks";
import { assertValidDateRangeForPlan } from "@/lib/api/utils/assert-valid-date-range-for-plan";
import { withWorkspace } from "@/lib/auth";
import { verifyFolderAccess } from "@/lib/folder/permissions";
import {
  analyticsPathParamsSchema,
  parseAnalyticsQuery,
} from "@/lib/zod/schemas/analytics";
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

    const parsedParams = parseAnalyticsQuery(searchParams);

    let {
      event,
      groupBy,
      interval,
      start,
      end,
      folderId,
      domain,
      key,
      linkId,
      externalId,
    } = parsedParams;

    event = oldEvent || event;
    groupBy = oldType || groupBy;

    let folderIdToVerify = getFirstFilterValue(folderId);
    if (!linkId && (externalId || (domain && key))) {
      const link = await getLinkOrThrow({
        workspaceId: workspace.id,
        linkId,
        externalId,
        domain: getFirstFilterValue(domain),
        key,
      });

      parsedParams.linkId = {
        operator: "IS",
        sqlOperator: "IN",
        values: [link.id],
      };

      // since we're filtering for a specific link, exclude domain from filters
      parsedParams.domain = undefined;

      if (link.folderId && !folderIdToVerify) {
        folderIdToVerify = link.folderId;
      }
    }

    if (folderIdToVerify) {
      await verifyFolderAccess({
        workspace,
        userId: session.user.id,
        folderId: folderIdToVerify,
        requiredPermission: "folders.read",
      });
    }

    assertValidDateRangeForPlan({
      plan: workspace.plan,
      dataAvailableFrom: workspace.createdAt,
      interval,
      start,
      end,
    });

    // Identify the request is from deprecated clicks endpoint
    // (/api/analytics/clicks)
    // (/api/analytics/count)
    // (/api/analytics/clicks/clicks)
    // (/api/analytics/clicks/count)
    const isDeprecatedClicksEndpoint =
      oldEvent === "clicks" || oldType === "count";

    console.time("getAnalytics");
    const response = await getAnalytics({
      ...parsedParams,
      event,
      groupBy,
      workspaceId: workspace.id,
      isDeprecatedClicksEndpoint,
      // dataAvailableFrom is only relevant for timeseries groupBy
      ...(groupBy === "timeseries" && {
        dataAvailableFrom: workspace.createdAt,
      }),
    });
    console.timeEnd("getAnalytics");

    return NextResponse.json(response);
  },
  {
    requiredPermissions: ["analytics.read"],
  },
);
