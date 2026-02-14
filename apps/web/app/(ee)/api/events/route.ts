import { getFirstFilterValue } from "@/lib/analytics/filter-helpers";
import { getEvents } from "@/lib/analytics/get-events";
import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import { throwIfClicksUsageExceeded } from "@/lib/api/links/usage-checks";
import { assertValidDateRangeForPlan } from "@/lib/api/utils/assert-valid-date-range-for-plan";
import { withWorkspace } from "@/lib/auth";
import { verifyFolderAccess } from "@/lib/folder/permissions";
import { eventsQuerySchema } from "@/lib/zod/schemas/analytics";
import { Link } from "@dub/prisma/client";
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
      linkId: linkIdFilter,
      externalId,
      domain: domainFilter,
      key,
      folderId: folderIdFilter,
    } = parsedParams;

    // Extract string values for specific link/folder lookup
    const domain = getFirstFilterValue(domainFilter);
    const linkId = getFirstFilterValue(linkIdFilter);
    const folderId = getFirstFilterValue(folderIdFilter);

    let link: Link | null = null;

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

    // When domain+key resolves a specific link, exclude domain from filters
    const { domain: _domain, key: _key, ...filterParams } = parsedParams;

    console.time("getEvents");
    const response = await getEvents({
      ...(link ? filterParams : parsedParams),
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
