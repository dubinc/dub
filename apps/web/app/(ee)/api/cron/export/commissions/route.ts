import { formatCommissionsForExport } from "@/lib/api/commissions/format-commissions-for-export";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { generateRandomString } from "@/lib/api/utils/generate-random-string";
import { exportCsvToStorage } from "@/lib/exports/export-csv-to-storage";
import { generateExportFilename } from "@/lib/exports/generate-export-filename";
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

// POST /api/cron/export/commissions - QStash worker for processing large commission exports
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

    const commissionsFilters = {
      ...filters,
      programId,
    };

    const formattedBatches = async function* () {
      for await (const { commissions } of fetchCommissionsBatch(
        commissionsFilters,
      )) {
        yield formatCommissionsForExport(commissions, columns);
      }
    };

    const { downloadUrl, rowCount } = await exportCsvToStorage({
      fileKey: `exports/commissions/${generateRandomString(16)}.csv`,
      fileName: generateExportFilename("commissions"),
      batches: formattedBatches(),
    });

    await sendEmail({
      to: user.email,
      subject: "Your commissions export is ready",
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
      `Export (${rowCount} commissions) generated and email sent to user.`,
    );
  } catch (error) {
    await log({
      message: `Error exporting commissions: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}
