import { exportAnalyticsToZip } from "@/lib/analytics/export-analytics-to-zip";
import {
  getFirstFilterValue,
  hasExactlyOneLinkIdFilter,
} from "@/lib/analytics/filter-helpers";
import { formatProgramAnalyticsForExport } from "@/lib/analytics/utils/format-analytics-export";
import { DubApiError } from "@/lib/api/errors";
import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import { throwIfClicksUsageExceeded } from "@/lib/api/links/usage-checks";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { assertValidDateRangeForPlan } from "@/lib/api/utils/assert-valid-date-range-for-plan";
import { prefixWorkspaceId } from "@/lib/api/workspaces/workspace-id";
import { withWorkspace } from "@/lib/auth";
import { verifyFolderAccess } from "@/lib/folder/permissions";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { ratelimit } from "@/lib/upstash";
import { parseAnalyticsQuery } from "@/lib/zod/schemas/analytics";

export const maxDuration = 300;

// GET /api/analytics/export – get export data for analytics
export const GET = withWorkspace(
  async ({ searchParams, workspace, session }) => {
    const { success } = await ratelimit(1, "30 s").limit(
      `analyticsExport:${workspace.id}`,
    );

    if (!success) {
      throw new DubApiError({
        code: "rate_limit_exceeded",
        message:
          "Analytics export is limited to once every 30 seconds. Please try again shortly.",
      });
    }

    throwIfClicksUsageExceeded(workspace);

    const parsedParams = parseAnalyticsQuery(searchParams);

    let {
      interval,
      start,
      end,
      folderId,
      domain,
      key,
      linkId,
      externalId,
      programId,
    } = parsedParams;

    let programStartedAt: Date | null | undefined = null;
    if (programId) {
      const workspaceProgramId = getDefaultProgramIdOrThrow(workspace);
      if (programId !== workspaceProgramId) {
        throw new DubApiError({
          code: "forbidden",
          message: `Program ${programId} does not belong to workspace ${prefixWorkspaceId(workspace.id)}.`,
        });
      }
      const program = await getProgramOrThrow({
        workspaceId: workspace.id,
        programId,
      });
      programStartedAt = program.startedAt;
    }

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
        endpoint === "timeseries"
          ? programStartedAt ?? workspace.createdAt
          : undefined,
      ...(programId && {
        formatRows: formatProgramAnalyticsForExport,
      }),
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
