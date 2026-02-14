import {
  eventsExportColumnAccessors,
  eventsExportColumnNames,
} from "@/lib/analytics/events-export-helpers";
import { getFirstFilterValue } from "@/lib/analytics/filter-helpers";
import { getAnalytics } from "@/lib/analytics/get-analytics";
import { getEvents } from "@/lib/analytics/get-events";
import { convertToCSV } from "@/lib/analytics/utils";
import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import { throwIfClicksUsageExceeded } from "@/lib/api/links/usage-checks";
import { assertValidDateRangeForPlan } from "@/lib/api/utils/assert-valid-date-range-for-plan";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { verifyFolderAccess } from "@/lib/folder/permissions";
import { eventsQuerySchema } from "@/lib/zod/schemas/analytics";
import { Link } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, capitalize } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const MAX_EVENTS_TO_EXPORT = 1000;

const exportQuerySchema = z
  .object({
    columns: z
      .string()
      .transform((c) => c.split(","))
      .pipe(z.string().array()),
  })
  .passthrough();

// GET /api/events/export – export events to CSV (with async support if >1000 events)
export const GET = withWorkspace(
  async ({ searchParams, workspace, session }) => {
    throwIfClicksUsageExceeded(workspace);

    const parsedParams = eventsQuerySchema.parse(searchParams);
    const { columns } = exportQuerySchema.parse(searchParams);

    const {
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

    // Count events using getAnalytics with groupBy: "count"
    const countResponse = await getAnalytics({
      ...parsedParams,
      groupBy: "count",
      workspaceId: workspace.id,
      dataAvailableFrom: workspace.createdAt,
    });

    // Extract the count based on event type
    // getAnalytics with groupBy: "count" returns an object like { clicks: 123 } or { leads: 45 } or { sales: 10, saleAmount: 5000 }
    const eventsCount =
      typeof countResponse === "object" && countResponse !== null
        ? (countResponse[event as keyof typeof countResponse] as number) ?? 0
        : typeof countResponse === "number"
          ? countResponse
          : 0;

    // Process the export in the background if the number of events is greater than MAX_EVENTS_TO_EXPORT
    if (eventsCount > MAX_EVENTS_TO_EXPORT) {
      await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/export/events/workspace`,
        body: {
          ...searchParams,
          workspaceId: workspace.id,
          userId: session.user.id,
        },
      });

      return NextResponse.json({}, { status: 202 });
    }

    const response = await getEvents({
      ...parsedParams,
      event,
      workspaceId: workspace.id,
      limit: MAX_EVENTS_TO_EXPORT,
    });

    const data = response.map((row) =>
      Object.fromEntries(
        columns.map((c) => [
          eventsExportColumnNames?.[c] ?? capitalize(c),
          eventsExportColumnAccessors[c]?.(row) ?? row?.[c],
        ]),
      ),
    );

    const csvData = convertToCSV(data);

    return new Response(csvData, {
      headers: {
        "Content-Type": "application/csv",
        "Content-Disposition": `attachment; filename=${event}_export.csv`,
      },
    });
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
