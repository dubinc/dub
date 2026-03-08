import { getFirstFilterValue } from "@/lib/analytics/filter-helpers";
import { getEvents } from "@/lib/analytics/get-events";
import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import { throwIfClicksUsageExceeded } from "@/lib/api/links/usage-checks";
import { assertValidDateRangeForPlan } from "@/lib/api/utils/assert-valid-date-range-for-plan";
import { withWorkspace } from "@/lib/auth";
import { verifyFolderAccess } from "@/lib/folder/permissions";
import { eventsQuerySchema } from "@/lib/zod/schemas/analytics";
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
      folderId,
      domain,
      key,
      linkId,
      externalId,
    } = parsedParams;

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

    console.time("getEvents");
    const response = await getEvents({
      ...parsedParams,
      event,
      workspaceId: workspace.id,
    });
    console.timeEnd("getEvents");

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
