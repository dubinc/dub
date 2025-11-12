import { getEvents } from "@/lib/analytics/get-events";
import { getFolderIdsToFilter } from "@/lib/analytics/get-folder-ids-to-filter";
import { convertToCSV } from "@/lib/analytics/utils";
import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import { throwIfClicksUsageExceeded } from "@/lib/api/links/usage-checks";
import { assertValidDateRangeForPlan } from "@/lib/api/utils/assert-valid-date-range-for-plan";
import { withWorkspace } from "@/lib/auth";
import { verifyFolderAccess } from "@/lib/folder/permissions";
import { ClickEvent, LeadEvent, SaleEvent } from "@/lib/types";
import { eventsQuerySchema } from "@/lib/zod/schemas/analytics";
import { COUNTRIES, capitalize } from "@dub/utils";
import { z } from "zod";

type Row = ClickEvent | LeadEvent | SaleEvent;

const columnNames: Record<string, string> = {
  trigger: "Event",
  url: "Destination URL",
  os: "OS",
  referer: "Referrer",
  refererUrl: "Referrer URL",
  timestamp: "Date",
  invoiceId: "Invoice ID",
  saleAmount: "Sale Amount",
  clickId: "Click ID",
};

const columnAccessors = {
  trigger: (r: Row) => r.click.trigger,
  event: (r: LeadEvent | SaleEvent) => r.eventName,
  url: (r: ClickEvent) => r.click.url,
  link: (r: Row) => r.domain + (r.key === "_root" ? "" : `/${r.key}`),
  country: (r: Row) =>
    r.country ? COUNTRIES[r.country] ?? r.country : r.country,
  referer: (r: ClickEvent) => r.click.referer,
  refererUrl: (r: ClickEvent) => r.click.refererUrl,
  customer: (r: LeadEvent | SaleEvent) =>
    r.customer.name + (r.customer.email ? ` <${r.customer.email}>` : ""),
  invoiceId: (r: SaleEvent) => r.sale.invoiceId,
  saleAmount: (r: SaleEvent) => "$" + (r.sale.amount / 100).toFixed(2),
  clickId: (r: ClickEvent) => r.click.id,
};

// GET /api/events/export – get export data for analytics
export const GET = withWorkspace(
  async ({ searchParams, workspace, session }) => {
    throwIfClicksUsageExceeded(workspace);

    const parsedParams = eventsQuerySchema
      .and(
        z.object({
          columns: z
            .string()
            .transform((c) => c.split(","))
            .pipe(z.string().array()),
        }),
      )
      .parse(searchParams);

    const { event, domain, interval, start, end, columns, key, folderId } =
      parsedParams;

    if (domain) {
      await getDomainOrThrow({ workspace, domain });
    }

    const link =
      domain && key
        ? await getLinkOrThrow({ workspaceId: workspace.id, domain, key })
        : null;

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

    const folderIds = folderIdToVerify
      ? undefined
      : await getFolderIdsToFilter({
          workspace,
          userId: session.user.id,
        });

    const response = await getEvents({
      ...parsedParams,
      ...(link && { linkId: link.id }),
      workspaceId: workspace.id,
      limit: 100000,
      folderIds,
      folderId: folderId || "",
    });

    const data = response.map((row) =>
      Object.fromEntries(
        columns.map((c) => [
          columnNames?.[c] ?? capitalize(c),
          columnAccessors[c]?.(row) ?? row?.[c],
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
