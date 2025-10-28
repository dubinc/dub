import { convertToCSV } from "@/lib/analytics/utils/convert-to-csv";
import { formatCommissionsForExport } from "@/lib/api/commissions/format-commissions-for-export";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { generateExportFilename } from "@/lib/api/utils/generate-export-filename";
import { generateRandomString } from "@/lib/api/utils/generate-random-string";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { storageV2 } from "@/lib/storage-v2";
import { commissionsExportQuerySchema } from "@/lib/zod/schemas/commissions";
import { sendEmail } from "@dub/email";
import ExportReady from "@dub/email/templates/partner-export-ready";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { z } from "zod";
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
      const formattedBatch = formatCommissionsForExport(commissions, columns);

      allCommissions.push(...formattedBatch);
    }

    const csvData = convertToCSV(allCommissions);

    // Upload to R2
    const fileKey = `exports/commissions/${generateRandomString(16)}.csv`;
    const csvBlob = new Blob([csvData], { type: "text/csv" });

    const uploadResult = await storageV2.upload({
      key: fileKey,
      body: csvBlob,
      contentType: "text/csv",
      headers: {
        "Content-Disposition": `attachment; filename="${generateExportFilename("commissions")}"`,
      },
    });

    if (!uploadResult || !uploadResult.url) {
      throw new Error("Failed to upload CSV to storage.");
    }

    // Generate a signed GET URL with 7-day expiry (604800 seconds)
    const downloadUrl = await storageV2.getSignedDownloadUrl({
      key: fileKey,
      expiresIn: 7 * 24 * 3600, // 7 days
    });

    if (!downloadUrl) {
      throw new Error("Failed to generate signed download URL.");
    }

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
