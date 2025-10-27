import { convertToCSV } from "@/lib/analytics/utils/convert-to-csv";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { generateRandomString } from "@/lib/api/utils/generate-random-string";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { storage } from "@/lib/storage";
import {
  exportPartnerColumns,
  partnersExportQuerySchema,
} from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../../utils";
import { fetchPartnersBatch } from "./fetch-partners-batch";

const payloadSchema = partnersExportQuerySchema.extend({
  programId: z.string(),
});

const columnIdToLabel = exportPartnerColumns.reduce(
  (acc, column) => {
    acc[column.id] = column.label;
    return acc;
  },
  {} as Record<string, string>,
);

const numericColumns = exportPartnerColumns
  .filter((column) => column.numeric)
  .map((column) => column.id);

// POST /api/cron/partners/export - QStash worker for processing large partner exports
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    let { programId, columns, ...filters } = payloadSchema.parse(
      JSON.parse(rawBody),
    );

    const program = await prisma.program.findUnique({
      where: {
        id: programId,
      },
    });

    if (!program) {
      return logAndRespond(`Program ${programId} not found`);
    }

    // Sort columns according to schema order
    const columnOrderMap = exportPartnerColumns.reduce(
      (acc, column, index) => {
        acc[column.id] = index + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    columns = columns.sort(
      (a, b) => (columnOrderMap[a] || 999) - (columnOrderMap[b] || 999),
    );

    // Create schema for validation
    const schemaFields: Record<string, any> = {};
    columns.forEach((column) => {
      if (numericColumns.includes(column)) {
        schemaFields[columnIdToLabel[column]] = z.coerce
          .number()
          .optional()
          .default(0);
      } else {
        schemaFields[columnIdToLabel[column]] = z
          .string()
          .optional()
          .default("");
      }
    });

    // Fetch partners in batches and build CSV
    const allPartners: any[] = [];

    for await (const { partners, totalFetched } of fetchPartnersBatch(
      {
        ...filters,
        programId,
      },
      1000,
    )) {
      const formattedBatch = partners.map((partner) => {
        const result: Record<string, any> = {};

        columns.forEach((column) => {
          let value = partner[column] || "";

          if (
            ["createdAt", "payoutsEnabledAt"].includes(column) &&
            value instanceof Date
          ) {
            value = value.toISOString();
          }

          result[columnIdToLabel[column]] = value;
        });

        return z.object(schemaFields).parse(result);
      });

      allPartners.push(...formattedBatch);
    }

    const csvData = convertToCSV(allPartners);

    // Upload to R2
    const fileKey = `exports/partners/${generateRandomString(60)}.csv`;
    const csvBlob = new Blob([csvData], { type: "text/csv" });
    const uploadResult = await storage.upload(fileKey, csvBlob, {
      contentType: "text/csv",
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment",
      },
    });

    if (!uploadResult || !uploadResult.url) {
      throw new Error("Failed to upload CSV to storage.");
    }

    // Send success email
    // await sendEmail({
    //   to: exportData.userEmail,
    //   subject: "Your partner export is ready",
    //   react: PartnerExportReady({
    //     email: exportData.userEmail,
    //     downloadUrl: uploadResult.url,
    //     rowCount: totalRows,
    //     workspaceName: workspace.name,
    //   }),
    // });

    return logAndRespond(`Partners exported to ${uploadResult.url}`);
  } catch (error) {
    await log({
      message: `Error exporting partners: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}
