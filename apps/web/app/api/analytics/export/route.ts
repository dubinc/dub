import { exportAnalyticsToZip } from "@/lib/analytics/export-analytics-to-zip";
import {
  getFirstFilterValue,
  hasExactlyOneLinkIdFilter,
} from "@/lib/analytics/filter-helpers";
import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import { throwIfClicksUsageExceeded } from "@/lib/api/links/usage-checks";
import { assertValidDateRangeForPlan } from "@/lib/api/utils/assert-valid-date-range-for-plan";
import { withWorkspace } from "@/lib/auth";
import { verifyFolderAccess } from "@/lib/folder/permissions";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { assertRateLimit } from "@/lib/upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
import { parseAnalyticsQuery } from "@/lib/zod/schemas/analytics";

export const maxDuration = 300;

// GET /api/analytics/export – get export data for analytics
export const GET = withWorkspace(
  async ({ searchParams, workspace, session }) => {
    await assertRateLimit({
      policy: RATELIMIT_POLICIES.analyticsExport,
      identifier: workspace.id,
    });

    throwIfClicksUsageExceeded(workspace);

    const parsedParams = parseAnalyticsQuery(searchParams);

    const { interval, start, end, folderId, domain, key, linkId, externalId } =
      parsedParams;

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

    const { canTrackConversions } = getPlanCapabilities(workspace.plan);

    const { domain: _domain, key: _key, ...filterParams } = parsedParams;
    const hasLinkIdFilter = Boolean(parsedParams.linkId);
    const analyticsParams = hasLinkIdFilter ? filterParams : parsedParams;

    const zipData = await exportAnalyticsToZip({
      params: analyticsParams,
      workspaceId: workspace.id,
      useComposite: canTrackConversions,
      skipTopLinksForSingleLink: hasExactlyOneLinkIdFilter(parsedParams.linkId),
      getDataAvailableFrom: (endpoint) =>
        endpoint === "timeseries" ? workspace.createdAt : undefined,
    });

    return new Response(zipData as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=analytics_export.zip",
      },
    });
  },
  {
    requiredPermissions: ["analytics.read"],
  },
);
