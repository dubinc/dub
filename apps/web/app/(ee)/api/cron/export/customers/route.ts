import { convertToCSV } from "@/lib/analytics/utils/convert-to-csv";
import { createDownloadableExport } from "@/lib/api/create-downloadable-export";
import { generateExportFilename } from "@/lib/api/utils/generate-export-filename";
import { generateRandomString } from "@/lib/api/utils/generate-random-string";
import { withCron } from "@/lib/cron/with-cron";
import { fetchCustomersBatch } from "@/lib/customers/api/fetch-customers-batch";
import { formatCustomersForExport } from "@/lib/customers/api/format-customers-export";
import { customersExportCronInputSchema } from "@/lib/zod/schemas/customers";
import { sendEmail } from "@dub/email";
import ExportReady from "@dub/email/templates/export-ready";
import { prisma } from "@dub/prisma";
import { logAndRespond } from "../../utils";

const MAX_CUSTOMERS_EXPORT_LIMIT = 100_000;

export const dynamic = "force-dynamic";

// POST /api/cron/export/customers - QStash worker for processing large customer exports
export const POST = withCron(async ({ rawBody }) => {
  const parsedFilters = customersExportCronInputSchema.parse(
    JSON.parse(rawBody),
  );

  const { workspaceId, userId, columns } = parsedFilters;

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

  const workspace = await prisma.project.findUnique({
    where: {
      id: workspaceId,
    },
    select: {
      name: true,
    },
  });

  if (!workspace) {
    return logAndRespond(`Workspace ${workspaceId} not found.`);
  }

  const allRows: Record<string, string | number>[] = [];

  for await (const { customers } of fetchCustomersBatch(parsedFilters)) {
    const formatted = formatCustomersForExport(customers, columns);
    const remaining = MAX_CUSTOMERS_EXPORT_LIMIT - allRows.length;

    if (remaining <= 0) {
      break;
    }

    allRows.push(...formatted.slice(0, remaining));
  }

  const csvData = convertToCSV(allRows);

  const { downloadUrl } = await createDownloadableExport({
    fileKey: `exports/customers/${generateRandomString(16)}.csv`,
    fileName: generateExportFilename("customers"),
    body: csvData,
    contentType: "text/csv",
  });

  await sendEmail({
    to: user.email,
    subject: "Your customers export is ready",
    react: ExportReady({
      email: user.email,
      exportType: "customers",
      downloadUrl,
      workspace: {
        name: workspace.name,
      },
    }),
  });

  const capped =
    allRows.length >= MAX_CUSTOMERS_EXPORT_LIMIT
      ? ` (capped at ${MAX_CUSTOMERS_EXPORT_LIMIT})`
      : "";

  return logAndRespond(
    `Export (${allRows.length} customers${capped}) generated and email sent to user.`,
  );
});
