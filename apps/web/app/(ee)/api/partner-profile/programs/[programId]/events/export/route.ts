import {
  eventsExportColumnAccessors,
  eventsExportColumnNames,
} from "@/lib/analytics/events-export-helpers";
import { getAnalytics } from "@/lib/analytics/get-analytics";
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
import { qstash } from "@/lib/cron";
import { generateRandomName } from "@/lib/names";
import {
  PartnerProfileLinkSchema,
  partnerProfileEventsQuerySchema,
} from "@/lib/zod/schemas/partner-profile";
import { APP_DOMAIN_WITH_NGROK, capitalize } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const MAX_EVENTS_TO_EXPORT = 1000;

// GET /api/partner-profile/programs/[programId]/events/export – get export data for partner profile events
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams, session }) => {
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

    // Count events using getAnalytics with groupBy: "count"
    const countResponse = await getAnalytics({
      ...rest,
      event,
      groupBy: "count",
      workspaceId: program.workspaceId,
      ...(linkId
        ? { linkId }
        : links.length > MAX_PARTNER_LINKS_FOR_LOCAL_FILTERING
          ? { partnerId: partner.id }
          : { linkIds: links.map((link) => link.id) }),
      dataAvailableFrom: program.startedAt ?? program.createdAt,
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
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/export/events/partner`,
        body: {
          ...searchParams,
          columns: columns.join(","),
          partnerId: partner.id,
          programId: params.programId,
          userId: session.user.id,
          ...(linkId && { linkId }),
          ...(domain && { domain }),
          ...(key && { key }),
          dataAvailableFrom: (
            program.startedAt ?? program.createdAt
          ).toISOString(),
        },
      });

      return NextResponse.json({}, { status: 202 });
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
      limit: MAX_EVENTS_TO_EXPORT,
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
);
