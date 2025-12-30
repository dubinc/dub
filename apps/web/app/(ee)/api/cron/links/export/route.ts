import { convertToCSV } from "@/lib/analytics/utils/convert-to-csv";
import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { createDownloadableExport } from "@/lib/api/create-downloadable-export";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { formatLinksForExport } from "@/lib/api/links/format-links-for-export";
import { validateLinksQueryFilters } from "@/lib/api/links/validate-links-query-filters";
import { generateExportFilename } from "@/lib/api/utils/generate-export-filename";
import { generateRandomString } from "@/lib/api/utils/generate-random-string";
import { MEGA_WORKSPACE_LINKS_LIMIT } from "@/lib/constants/misc";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { PlanProps } from "@/lib/types";
import { linksExportQuerySchema } from "@/lib/zod/schemas/links";
import { sendEmail } from "@dub/email";
import ExportReady from "@dub/email/templates/export-ready";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { endOfDay, startOfDay } from "date-fns";
import { z } from "zod";
import { logAndRespond } from "../../utils";
import { fetchLinksBatch } from "./fetch-links-batch";

const payloadSchema = linksExportQuerySchema.extend({
  workspaceId: z.string(),
  userId: z.string(),
});

// POST /api/cron/links/export - QStash worker for processing large link exports
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
        plan: true,
        totalLinks: true,
        foldersUsage: true,
        users: {
          select: {
            role: true,
            defaultFolderId: true,
          },
        },
      },
    });

    if (!workspace) {
      return logAndRespond(
        `Workspace ${workspaceId} not found. Skipping the export.`,
      );
    }

    const { folderIds } = await validateLinksQueryFilters({
      ...filters,
      userId,
      workspace: {
        ...workspace,
        plan: workspace.plan as PlanProps,
      },
    });

    const { interval, start, end } = filters;

    const { startDate, endDate } = getStartEndDates({
      interval,
      start: start ? startOfDay(new Date(start)) : undefined,
      end: end ? endOfDay(new Date(end)) : undefined,
    });

    // Fetch links in batches and build CSV
    const allLinks: Record<string, any>[] = [];

    const linksFilters = {
      ...filters,
      ...(interval !== "all" && {
        startDate,
        endDate,
      }),
      searchMode: (workspace.totalLinks > MEGA_WORKSPACE_LINKS_LIMIT
        ? "exact"
        : "fuzzy") as "exact" | "fuzzy",
      includeDashboard: false,
      includeUser: false,
      includeWebhooks: false,
      workspaceId,
      folderIds,
    };

    for await (const { links } of fetchLinksBatch(linksFilters)) {
      allLinks.push(...formatLinksForExport(links, columns));
    }

    const csvData = convertToCSV(allLinks);

    const { downloadUrl } = await createDownloadableExport({
      fileKey: `exports/links/${generateRandomString(16)}.csv`,
      fileName: generateExportFilename("links"),
      body: csvData,
      contentType: "text/csv",
    });

    await sendEmail({
      to: user.email,
      subject: "Your link export is ready",
      react: ExportReady({
        email: user.email,
        exportType: "links",
        downloadUrl,
        workspace: {
          name: workspace.name,
        },
      }),
    });

    return logAndRespond(
      `Export (${allLinks.length} links) generated and email sent to user.`,
    );
  } catch (error) {
    await log({
      message: `Error exporting links: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}
