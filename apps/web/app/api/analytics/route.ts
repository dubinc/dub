import { VALID_ANALYTICS_ENDPOINTS } from "@/lib/analytics/constants";
import { getAnalytics } from "@/lib/analytics/get-analytics";
import { getFolderIdsToFilter } from "@/lib/analytics/get-folder-ids-to-filter";
import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { DubApiError } from "@/lib/api/errors";
import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import { throwIfClicksUsageExceeded } from "@/lib/api/links/usage-checks";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { assertValidDateRangeForPlan } from "@/lib/api/utils/assert-valid-date-range-for-plan";
import { prefixWorkspaceId } from "@/lib/api/workspaces/workspace-id";
import { withWorkspace } from "@/lib/auth";
import { verifyFolderAccess } from "@/lib/folder/permissions";
import {
  analyticsPathParamsSchema,
  analyticsQuerySchema,
} from "@/lib/zod/schemas/analytics";
import { Link } from "@dub/prisma/client";
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
    } = parsedParams;

    let link: Link | null = null;

    event = oldEvent || event;
    groupBy = oldType || groupBy;

    let programStartedAt: Date | null | undefined = null;
    if (programId) {
      const workspaceProgramId = getDefaultProgramIdOrThrow(workspace);
      if (programId !== workspaceProgramId) {
        throw new DubApiError({
          code: "forbidden",
          message: `Program ${programId} does not belong to workspace ${prefixWorkspaceId(workspace.id)}.`,
        });
      }
      if (groupBy === "timeseries") {
        const program = await getProgramOrThrow({
          workspaceId: workspace.id,
          programId,
        });
        programStartedAt = program.startedAt;
      }
    }

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

    // no need to get folder ids if we are filtering by a folder or program
    const folderIds =
      folderIdToVerify || programId
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
      folderIds,
      workspaceId: workspace.id,
      isDeprecatedClicksEndpoint,
      // dataAvailableFrom is only relevant for timeseries groupBy
      ...(groupBy === "timeseries" && {
        dataAvailableFrom: programStartedAt ?? workspace.createdAt,
      }),
    });

    return NextResponse.json(response);
  },
  {
    requiredPermissions: ["analytics.read"],
  },
);
