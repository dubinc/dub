import { convertToCSV } from "@/lib/analytics/utils/convert-to-csv";
import { createDownloadableExport } from "@/lib/api/create-downloadable-export";
import { formatPayoutsForExport } from "@/lib/api/payouts/format-payouts-for-export";
import { generateExportFilename } from "@/lib/api/utils/generate-export-filename";
import { generateRandomString } from "@/lib/api/utils/generate-random-string";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import {
  payoutsExportCronInputSchema,
  payoutsQuerySchema,
} from "@/lib/zod/schemas/payouts";
import { sendEmail } from "@dub/email";
import ExportReady from "@dub/email/templates/export-ready";
import { logAndRespond } from "../../utils";
import { fetchPayoutsBatch } from "./fetch-payouts-batch";

const MAX_PAYOUTS_EXPORT_LIMIT = 100_000;

export const dynamic = "force-dynamic";

// POST /api/cron/export/payouts - QStash worker for processing large payout exports
export const POST = withCron(async ({ rawBody }) => {
  const payload = JSON.parse(rawBody);

  const { workspaceId, programId, userId, columns } =
    payoutsExportCronInputSchema.parse(payload);

  const filters = payoutsQuerySchema
    .omit({
      page: true,
      pageSize: true,
    })
    .parse(payload);

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      email: true,
    },
  });

  if (!user) {
    return logAndRespond(`User ${userId} not found.`);
  }

  if (!user.email) {
    return logAndRespond(`User ${userId} has no email.`);
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
    return logAndRespond(`Program ${programId} not found.`);
  }

  const allRows: Record<string, string | number>[] = [];

  for await (const { payouts } of fetchPayoutsBatch({
    workspaceId,
    programId,
    filters,
  })) {
    const formatted = formatPayoutsForExport(payouts, columns);
    const remaining = MAX_PAYOUTS_EXPORT_LIMIT - allRows.length;

    if (remaining <= 0) {
      break;
    }

    allRows.push(...formatted.slice(0, remaining));
  }

  const csvData = convertToCSV(allRows);

  const { downloadUrl } = await createDownloadableExport({
    fileKey: `exports/payouts/${generateRandomString(16)}.csv`,
    fileName: generateExportFilename("payouts"),
    body: csvData,
    contentType: "text/csv",
  });

  await sendEmail({
    to: user.email,
    subject: "Your payouts export is ready",
    react: ExportReady({
      email: user.email,
      exportType: "payouts",
      downloadUrl,
      program: {
        name: program.name,
      },
    }),
  });

  const capped =
    allRows.length >= MAX_PAYOUTS_EXPORT_LIMIT
      ? ` (capped at ${MAX_PAYOUTS_EXPORT_LIMIT})`
      : "";

  return logAndRespond(
    `Export (${allRows.length} payouts${capped}) generated and email sent to user.`,
  );
});
