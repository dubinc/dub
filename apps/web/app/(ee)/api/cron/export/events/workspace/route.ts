import {
  eventsExportColumnAccessors,
  eventsExportColumnNames,
} from "@/lib/analytics/events-export-helpers";
import { convertToCSV } from "@/lib/analytics/utils/convert-to-csv";
import { createDownloadableExport } from "@/lib/api/create-downloadable-export";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { generateExportFilename } from "@/lib/api/utils/generate-export-filename";
import { generateRandomString } from "@/lib/api/utils/generate-random-string";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { eventsQuerySchema } from "@/lib/zod/schemas/analytics";
import { sendEmail } from "@dub/email";
import ExportReady from "@dub/email/templates/export-ready";
import { prisma } from "@dub/prisma";
import { capitalize, log } from "@dub/utils";
import * as z from "zod/v4";
import { logAndRespond } from "../../../utils";
import { fetchEventsBatch } from "../fetch-events-batch";

const payloadSchema = eventsQuerySchema.extend({
  columns: z
    .string()
    .transform((c) => c.split(","))
    .pipe(z.string().array()),
  workspaceId: z.string(),
  userId: z.string(),
  linkId: z.string().optional(),
  folderIds: z.array(z.string()).optional(),
  folderId: z.string().optional(),
  dataAvailableFrom: z.string().optional(),
});

// POST /api/cron/export/events/workspace - QStash worker for processing large event exports
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const { columns, workspaceId, userId, ...filters } = payloadSchema.parse(
      JSON.parse(rawBody),
    );

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

    const workspace = await prisma.project.findUnique({
      where: {
        id: workspaceId,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    if (!workspace) {
      return logAndRespond(
        `Workspace ${workspaceId} not found. Skipping the export.`,
      );
    }

    const { linkId, folderIds, folderId, dataAvailableFrom, ...eventFilters } =
      filters;

    // Fetch events in batches and build CSV
    const allEvents: Record<string, any>[] = [];

    const eventsFilters = {
      ...eventFilters,
      ...(linkId && { linkId }),
      workspaceId,
      folderIds,
      folderId: folderId || "",
      dataAvailableFrom: dataAvailableFrom
        ? new Date(dataAvailableFrom)
        : workspace.createdAt,
    };

    for await (const { events } of fetchEventsBatch(eventsFilters)) {
      const formattedEvents = events.map((row) =>
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
      fileKey: `exports/events/workspace/${generateRandomString(16)}.csv`,
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
        workspace: {
          name: workspace.name,
        },
      }),
    });

    return logAndRespond(
      `Export (${allEvents.length} events) generated and email sent to user.`,
    );
  } catch (error) {
    await log({
      message: `Error exporting events: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}
