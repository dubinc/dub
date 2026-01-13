import { getEvents } from "@/lib/analytics/get-events";
import { convertToCSV } from "@/lib/analytics/utils";
import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import {
  LARGE_PROGRAM_IDS,
  LARGE_PROGRAM_MIN_TOTAL_COMMISSIONS_CENTS,
  MAX_PARTNER_LINKS_FOR_LOCAL_FILTERING,
} from "@/lib/constants/partner-profile";
import { generateRandomName } from "@/lib/names";
import { ClickEvent, LeadEvent, SaleEvent } from "@/lib/types";
import {
  PartnerProfileLinkSchema,
  partnerProfileEventsQuerySchema,
} from "@/lib/zod/schemas/partner-profile";
import { COUNTRIES, capitalize } from "@dub/utils";
import * as z from "zod/v4";

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

// GET /api/partner-profile/programs/[programId]/events/export – get export data for partner profile events
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { program, links, totalCommissions, customerDataSharingEnabledAt } =
      await getProgramEnrollmentOrThrow({
        partnerId: partner.id,
        programId: params.programId,
        include: {
          program: true,
          links: true,
        },
      });

    if (
      LARGE_PROGRAM_IDS.includes(program.id) &&
      totalCommissions < LARGE_PROGRAM_MIN_TOTAL_COMMISSIONS_CENTS
    ) {
      throw new DubApiError({
        code: "forbidden",
        message: "This feature is not available for your program.",
      });
    }

    const parsedParams = partnerProfileEventsQuerySchema
      .extend({
        columns: z
          .string()
          .optional()
          .transform((c) => (c ? c.split(",") : []))
          .pipe(z.string().array()),
      })
      .parse(searchParams);

    const { event, columns: columnsParam } = parsedParams;
    let { linkId, domain, key, ...rest } = parsedParams;

    // Default columns based on event type if not provided
    const defaultColumns: Record<string, string[]> = {
      clicks: ["timestamp", "link", "referer", "country", "device"],
      leads: ["timestamp", "event", "link", "customer", "referer"],
      sales: [
        "timestamp",
        "saleAmount",
        "event",
        "customer",
        "referer",
        "link",
      ],
    };

    const columns =
      columnsParam.length > 0
        ? columnsParam
        : defaultColumns[event] || defaultColumns.clicks;

    if (linkId) {
      if (!links.some((link) => link.id === linkId)) {
        throw new DubApiError({
          code: "not_found",
          message: "Link not found",
        });
      }
    } else if (domain && key) {
      const foundLink = links.find(
        (link) => link.domain === domain && link.key === key,
      );
      if (!foundLink) {
        throw new DubApiError({
          code: "not_found",
          message: "Link not found",
        });
      }

      linkId = foundLink.id;
    }

    if (links.length === 0) {
      return new Response("", {
        headers: {
          "Content-Type": "application/csv",
          "Content-Disposition": `attachment; filename=${event}_export.csv`,
        },
      });
    }

    const events = await getEvents({
      ...rest,
      workspaceId: program.workspaceId,
      ...(linkId
        ? { linkId }
        : links.length > MAX_PARTNER_LINKS_FOR_LOCAL_FILTERING
          ? { partnerId: partner.id }
          : { linkIds: links.map((link) => link.id) }),
      dataAvailableFrom: program.startedAt ?? program.createdAt,
      limit: 100000,
    });

    // Apply partner profile data transformations similar to the main events route
    const transformedEvents = events.map((event) => {
      // don't return ip address for partner profile
      // @ts-ignore – ip is deprecated but present in the data
      const { ip, click, customer, ...eventRest } = event;
      const { ip: _, ...clickRest } = click;

      return {
        ...eventRest,
        click: clickRest,
        link: event?.link ? PartnerProfileLinkSchema.parse(event.link) : null,
        ...(customer && {
          customer: z
            .object({
              id: z.string(),
              email: z.string(),
              ...(customerDataSharingEnabledAt && { name: z.string() }),
            })
            .parse({
              ...customer,
              email: customer.email
                ? customerDataSharingEnabledAt
                  ? customer.email
                  : customer.email.replace(/(?<=^.).+(?=.@)/, "****")
                : customer.name || generateRandomName(),
              ...(customerDataSharingEnabledAt && {
                name: customer.name || generateRandomName(),
              }),
            }),
        }),
      };
    });

    const data = transformedEvents.map((row) =>
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
);
