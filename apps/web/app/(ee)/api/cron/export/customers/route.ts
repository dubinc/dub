import { withCron } from "@/lib/cron/with-cron";
import { exportCustomers } from "@/lib/exports/customers/export";
import { customersExportCronInputSchema } from "@/lib/zod/schemas/customers";
import { sendEmail } from "@dub/email";
import ExportReady from "@dub/email/templates/export-ready";
import { prisma } from "@dub/prisma";
import { logAndRespond } from "../../utils";

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

  const { downloadUrl, rowCount } = await exportCustomers({
    filters: parsedFilters,
    columns,
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

  return logAndRespond(
    `Export (${rowCount} customers) generated and email sent to user.`,
  );
});
