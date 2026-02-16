import {
  eventsExportColumnAccessors,
  eventsExportColumnNames,
} from "@/lib/analytics/events-export-helpers";
import { getFirstFilterValue } from "@/lib/analytics/filter-helpers";
import { convertToCSV } from "@/lib/analytics/utils/convert-to-csv";
import { createDownloadableExport } from "@/lib/api/create-downloadable-export";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { generateExportFilename } from "@/lib/api/utils/generate-export-filename";
import { generateRandomString } from "@/lib/api/utils/generate-random-string";
import { MAX_PARTNER_LINKS_FOR_LOCAL_FILTERING } from "@/lib/constants/partner-profile";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { generateRandomName } from "@/lib/names";
import {
  partnerProfileEventsQuerySchema,
  PartnerProfileLinkSchema,
} from "@/lib/zod/schemas/partner-profile";
import { sendEmail } from "@dub/email";
import ExportReady from "@dub/email/templates/export-ready";
import { prisma } from "@dub/prisma";
import { capitalize, log, parseFilterValue } from "@dub/utils";
import * as z from "zod/v4";
import { logAndRespond } from "../../../utils";
import { fetchEventsBatch } from "../fetch-events-batch";

const payloadSchema = partnerProfileEventsQuerySchema.extend({
  columns: z
    .string()
    .transform((c) => c.split(","))
    .pipe(z.string().array()),
  partnerId: z.string(),
  programId: z.string(),
  userId: z.string(),
});

// POST /api/cron/export/events/partner - QStash worker for processing large partner event exports
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const { columns, partnerId, programId, userId, ...parsedParams } =
      payloadSchema.parse(JSON.parse(rawBody));

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        email: true,
      },
    });

    if (!user) {
      return logAndRespond(`User ${userId} not found. Skipping the export.`);
    }

    if (!user.email) {
      return logAndRespond(`User ${userId} has no email. Skipping the export.`);
    }

    const { program, links, customerDataSharingEnabledAt } =
      await getProgramEnrollmentOrThrow({
        partnerId,
        programId,
        include: {
          program: true,
          links: true,
        },
      });

    // If no links, return early with empty export
    if (links.length === 0) {
      return logAndRespond("No links found. Skipping the export.");
    }

    const { linkId, domain, key } = parsedParams;

    if (linkId) {
      // check to make sure all of the linkId.values are in the links
      if (
        !linkId.values.every((value) => links.some((link) => link.id === value))
      ) {
        return logAndRespond(
          "One or more links are not found. Skipping the export.",
        );
      }
    } else if (domain && key) {
      const link = links.find(
        (link) =>
          link.domain === getFirstFilterValue(domain) && link.key === key,
      );
      if (!link) {
        return logAndRespond("Link not found. Skipping the export.");
      }

      parsedParams.linkId = {
        operator: "IS",
        sqlOperator: "IN",
        values: [link.id],
      };
    }

    // Fetch events in batches and build CSV
    const allEvents: Record<string, any>[] = [];

    const eventsFilters = {
      ...parsedParams,
      workspaceId: program.workspaceId,
      ...(parsedParams.linkId
        ? { linkId: parsedParams.linkId }
        : links.length > MAX_PARTNER_LINKS_FOR_LOCAL_FILTERING
          ? { partnerId }
          : { linkId: parseFilterValue(links.map((link) => link.id)) }),
      dataAvailableFrom: program.startedAt ?? program.createdAt,
    };

    for await (const { events } of fetchEventsBatch(eventsFilters)) {
      // Apply partner profile data transformations
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

      const formattedEvents = transformedEvents.map((row) =>
        Object.fromEntries(
          columns.map((c) => [
            eventsExportColumnNames?.[c] ?? capitalize(c),
            eventsExportColumnAccessors[c]?.(row) ?? row?.[c],
          ]),
        ),
      );
      allEvents.push(...formattedEvents);
    }

    const csvData = convertToCSV(allEvents);

    const { downloadUrl } = await createDownloadableExport({
      fileKey: `exports/events/partner/${generateRandomString(16)}.csv`,
      fileName: generateExportFilename("events"),
      body: csvData,
      contentType: "text/csv",
    });

    await sendEmail({
      to: user.email,
      subject: "Your events export is ready",
      react: ExportReady({
        email: user.email,
        exportType: "events",
        downloadUrl,
        program: {
          name: program.name,
        },
      }),
    });

    return logAndRespond(
      `Export (${allEvents.length} events) generated and email sent to user.`,
    );
  } catch (error) {
    await log({
      message: `Error exporting partner events: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}
