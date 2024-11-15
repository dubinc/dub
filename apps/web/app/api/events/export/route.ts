import { getEvents } from "@/lib/analytics/get-events";
import { convertToCSV, validDateRangeForPlan } from "@/lib/analytics/utils";
import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import { throwIfClicksUsageExceeded } from "@/lib/api/links/usage-checks";
import { withWorkspace } from "@/lib/auth";
import { eventsQuerySchema } from "@/lib/zod/schemas/analytics";
import { clickEventResponseSchema } from "@/lib/zod/schemas/clicks";
import { leadEventResponseSchema } from "@/lib/zod/schemas/leads";
import { saleEventResponseSchema } from "@/lib/zod/schemas/sales";
import { COUNTRIES, capitalize } from "@dub/utils";
import { z } from "zod";

type ClickEvent = z.infer<typeof clickEventResponseSchema>;
type LeadEvent = z.infer<typeof leadEventResponseSchema>;
type SaleEvent = z.infer<typeof saleEventResponseSchema>;

type Row = ClickEvent | LeadEvent | SaleEvent;

const columnNames: Record<string, string> = {
  trigger: "Event",
  os: "OS",
  timestamp: "Date",
  invoiceId: "Invoice ID",
  saleAmount: "Sale Amount",
};

const columnAccessors = {
  trigger: (r: Row) => (r.qr ? "QR scan" : "Link click"),
  event: (r: LeadEvent | SaleEvent) => r.eventName,
  link: (r: Row) => r.domain + (r.key === "_root" ? "" : `/${r.key}`),
  country: (r: Row) =>
    r.country ? COUNTRIES[r.country] ?? r.country : r.country,
  customer: (r: LeadEvent | SaleEvent) =>
    r.customer.name + (r.customer.email ? ` <${r.customer.email}>` : ""),
  invoiceId: (r: SaleEvent) => r.sale.invoiceId,
  saleAmount: (r: SaleEvent) => "$" + (r.sale.amount / 100).toFixed(2),
};

// GET /api/events/export – get export data for analytics
export const GET = withWorkspace(
  async ({ searchParams, workspace }) => {
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

    const { event, domain, interval, start, end, columns, key } = parsedParams;

    if (domain) {
      await getDomainOrThrow({ workspace, domain });
    }

    const link =
      domain && key ? await getLinkOrThrow({ workspace, domain, key }) : null;

    validDateRangeForPlan({
      plan: workspace.plan,
      conversionEnabled: workspace.conversionEnabled,
      interval,
      start,
      end,
      throwError: true,
    });

    const response = await getEvents({
      ...parsedParams,
      ...(link && { linkId: link.id }),
      workspaceId: workspace.id,
      limit: 100000,
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
      "enterprise",
    ],
    requiredPermissions: ["analytics.read"],
  },
);
