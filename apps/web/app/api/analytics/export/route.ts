import { VALID_ANALYTICS_ENDPOINTS } from "@/lib/analytics/constants";
import { getFirstFilterValue } from "@/lib/analytics/filter-helpers";
import { getAnalytics } from "@/lib/analytics/get-analytics";
import { convertToCSV } from "@/lib/analytics/utils";
import { DubApiError } from "@/lib/api/errors";
import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import { throwIfClicksUsageExceeded } from "@/lib/api/links/usage-checks";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { assertValidDateRangeForPlan } from "@/lib/api/utils/assert-valid-date-range-for-plan";
import { prefixWorkspaceId } from "@/lib/api/workspaces/workspace-id";
import { withWorkspace } from "@/lib/auth";
import { verifyFolderAccess } from "@/lib/folder/permissions";
import { parseAnalyticsQuery } from "@/lib/zod/schemas/analytics";
import { Link } from "@dub/prisma/client";
import JSZip from "jszip";

// GET /api/analytics/export – get export data for analytics
export const GET = withWorkspace(
  async ({ searchParams, workspace, session }) => {
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

    let link: Link | null = null;

    let programStartedAt: Date | null | undefined = null;
    if (programId) {
      const workspaceProgramId = getDefaultProgramIdOrThrow(workspace);
      if (programId !== workspaceProgramId) {
        throw new DubApiError({
          code: "forbidden",
          message: `Program ${programId} does not belong to workspace ${prefixWorkspaceId(workspace.id)}.`,
        });
      }
      // dataAvailableFrom for timeseries is resolved per-endpoint below
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

    // When domain+key resolves a specific link, exclude domain from filters
    const { domain: _domain, key: _key, ...filterParams } = parsedParams;

    const zip = new JSZip();

    await Promise.all(
      VALID_ANALYTICS_ENDPOINTS.map(async (endpoint) => {
        // no need to fetch top links data if there's a link specified
        // since this is just a single link
        if (endpoint === "top_links" && link) return;
        // skip clicks count
        if (endpoint === "count") return;

        const response = await getAnalytics({
          ...(link ? filterParams : parsedParams),
          workspaceId: workspace.id,
          groupBy: endpoint,
          isDeprecatedClicksEndpoint: false,
          ...(endpoint === "timeseries" && {
            dataAvailableFrom: programStartedAt ?? workspace.createdAt,
          }),
        });

        if (!response || response.length === 0) return;

        const csvData = convertToCSV(response);
        zip.file(`${endpoint}.csv`, csvData);
      }),
    );

    const zipData = await zip.generateAsync({ type: "nodebuffer" });

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
