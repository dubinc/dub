import { convertToCSV } from "@/lib/analytics/utils/convert-to-csv";
import { createDownloadableExport } from "@/lib/api/create-downloadable-export";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { generateExportFilename } from "@/lib/api/utils/generate-export-filename";
import { generateRandomString } from "@/lib/api/utils/generate-random-string";
import { CUSTOMER_LTV_EXCLUDED_PROGRAM_IDS } from "@/lib/constants/partner-profile";
import { withCron } from "@/lib/cron/with-cron";
import { formatPartnerCustomersForExport } from "@/lib/customers/api/format-partner-customers-export";
import { prisma, sanitizeFullTextSearch } from "@/lib/prisma";
import { partnerCustomersExportCronInputSchema } from "@/lib/zod/schemas/partner-profile";
import { sendEmail } from "@dub/email";
import ExportReady from "@dub/email/templates/export-ready";
import { CommissionType } from "@prisma/client";
import { logAndRespond } from "../../../utils";

const MAX_CUSTOMERS_EXPORT_LIMIT = 100_000;
const PAGE_SIZE = 1000;

export const dynamic = "force-dynamic";

// POST /api/cron/export/customers/partner - QStash worker for processing large partner customer exports
export const POST = withCron(async ({ rawBody }) => {
  const parsedFilters = partnerCustomersExportCronInputSchema.parse(
    JSON.parse(rawBody),
  );

  const {
    partnerId,
    programId,
    userId,
    columns,
    search,
    country,
    linkId,
    sortBy,
    sortOrder,
  } = parsedFilters;

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

  const { program, customerDataSharingEnabledAt } =
    await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
      include: {
        program: true,
      },
    });

  const ltvExcluded = CUSTOMER_LTV_EXCLUDED_PROGRAM_IDS.includes(program.id);

  const where = {
    partnerId,
    programId: program.id,
    projectId: program.workspaceId,
    ...(country && { country }),
    ...(linkId && { linkId }),
    ...(search && customerDataSharingEnabledAt
      ? search.includes("@")
        ? { email: search }
        : {
            email: { search: sanitizeFullTextSearch(search) },
            name: { search: sanitizeFullTextSearch(search) },
          }
      : {}),
  };

  const allRows: Record<string, string | number>[] = [];
  let page = 1;

  while (allRows.length < MAX_CUSTOMERS_EXPORT_LIMIT) {
    const customers = await prisma.customer.findMany({
      where,
      include: {
        link: true,
        commissions: {
          where: {
            partnerId,
            type: CommissionType.sale,
          },
          take: 1,
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: [{ [sortBy]: sortOrder }, { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });

    if (customers.length === 0) {
      break;
    }

    const formatted = formatPartnerCustomersForExport(customers, columns, {
      customerDataSharingEnabledAt,
      ltvExcluded,
    });
    const remaining = MAX_CUSTOMERS_EXPORT_LIMIT - allRows.length;
    allRows.push(...formatted.slice(0, remaining));

    if (customers.length < PAGE_SIZE) {
      break;
    }

    page++;
  }

  const csvData = convertToCSV(allRows);

  const { downloadUrl } = await createDownloadableExport({
    fileKey: `exports/customers/partner/${generateRandomString(16)}.csv`,
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
      program: {
        name: program.name,
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
