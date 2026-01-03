import { convertToCSV } from "@/lib/analytics/utils/convert-to-csv";
import { formatCommissionsForExport } from "@/lib/api/commissions/format-commissions-for-export";
import { createDownloadableExport } from "@/lib/api/create-downloadable-export";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { generateExportFilename } from "@/lib/api/utils/generate-export-filename";
import { generateRandomString } from "@/lib/api/utils/generate-random-string";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { commissionsExportQuerySchema } from "@/lib/zod/schemas/commissions";
import { sendEmail } from "@dub/email";
import ExportReady from "@dub/email/templates/export-ready";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";
import { fetchCommissionsBatch } from "./fetch-commissions-batch";

const payloadSchema = commissionsExportQuerySchema.extend({
  programId: z.string(),
  userId: z.string(),
});

// POST /api/cron/commissions/export - QStash worker for processing large commission exports
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    let { programId, columns, userId, ...filters } = payloadSchema.parse(
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

    const program = await prisma.program.findUnique({
      where: {
        id: programId,
      },
      select: {
        name: true,
      },
    });

    if (!program) {
      return logAndRespond(
        `Program ${programId} not found. Skipping the export.`,
      );
    }

    // Fetch commissions in batches and build CSV
    const allCommissions: any[] = [];
    const commissionsFilters = {
      ...filters,
      programId,
    };

    for await (const { commissions } of fetchCommissionsBatch(
      commissionsFilters,
    )) {
      allCommissions.push(...formatCommissionsForExport(commissions, columns));
    }

    const csvData = convertToCSV(allCommissions);

    const { downloadUrl } = await createDownloadableExport({
      fileKey: `exports/commissions/${generateRandomString(16)}.csv`,
      fileName: generateExportFilename("commissions"),
      body: csvData,
      contentType: "text/csv",
    });

    await sendEmail({
      to: user.email,
      subject: "Your commission export is ready",
      react: ExportReady({
        email: user.email,
        exportType: "commissions",
        downloadUrl,
        program: {
          name: program.name,
        },
      }),
    });

    return logAndRespond(
      `Export (${allCommissions.length} commissions) generated and email sent to user.`,
    );
  } catch (error) {
    await log({
      message: `Error exporting commissions: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}
