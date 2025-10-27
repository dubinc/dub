import { convertToCSV } from "@/lib/analytics/utils/convert-to-csv";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { formatPartnersForExport } from "@/lib/api/partners/format-partners-for-export";
import { generateRandomString } from "@/lib/api/utils/generate-random-string";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { storage } from "@/lib/storage";
import { partnersExportQuerySchema } from "@/lib/zod/schemas/partners";
import { sendEmail } from "@dub/email";
import PartnerExportReady from "@dub/email/templates/partner-export-ready";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../../utils";
import { fetchPartnersBatch } from "./fetch-partners-batch";

const payloadSchema = partnersExportQuerySchema.extend({
  programId: z.string(),
  userId: z.string(),
});

// POST /api/cron/partners/export - QStash worker for processing large partner exports
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

    // Fetch partners in batches and build CSV
    const allPartners: any[] = [];
    const partnersFilters = {
      ...filters,
      programId,
    };

    for await (const { partners } of fetchPartnersBatch(
      partnersFilters,
      1000,
    )) {
      const formattedBatch = formatPartnersForExport(partners, columns);

      allPartners.push(...formattedBatch);
    }

    const csvData = convertToCSV(allPartners);

    // Upload to R2 as private file (not publicly accessible)
    const fileKey = `exports/partners/${generateRandomString(60)}.csv`;
    const csvBlob = new Blob([csvData], { type: "text/csv" });
    const uploadResult = await storage.upload(fileKey, csvBlob, {
      contentType: "text/csv",
      access: "private",
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment",
      },
    });

    if (!uploadResult || !uploadResult.url) {
      throw new Error("Failed to upload CSV to storage.");
    }

    // Generate a signed GET URL with 7-day expiry (604800 seconds)
    const downloadUrl = await storage.getSignedUrl(fileKey, {
      method: "GET",
      expiresIn: 7 * 24 * 3600, // 7 days
    });

    await sendEmail({
      to: user.email,
      subject: "Your partner export is ready",
      react: PartnerExportReady({
        email: user.email,
        downloadUrl,
        program: {
          name: program.name,
        },
      }),
    });

    return logAndRespond(
      `Export (${allPartners.length} partners) generated and email sent to user.`,
    );
  } catch (error) {
    await log({
      message: `Error exporting partners: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}
