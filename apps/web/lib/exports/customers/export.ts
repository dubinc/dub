import { generateRandomString } from "@/lib/api/utils/generate-random-string";
import { exportCsvToStorage } from "@/lib/exports/export-csv-to-storage";
import { generateExportFilename } from "@/lib/exports/generate-export-filename";
import { customersExportCronInputSchema } from "@/lib/zod/schemas/customers";
import * as z from "zod/v4";
import { fetchCustomersBatch } from "./fetch";
import { formatCustomersForExport } from "./format";

export async function exportCustomers({
  filters,
  columns,
}: {
  filters: z.infer<typeof customersExportCronInputSchema>;
  columns: string[];
}) {
  const formattedBatches = async function* () {
    for await (const { customers } of fetchCustomersBatch(filters)) {
      yield formatCustomersForExport(customers, columns);
    }
  };

  return exportCsvToStorage({
    fileKey: `exports/customers/${generateRandomString(16)}.csv`,
    fileName: generateExportFilename("customers"),
    batches: formattedBatches(),
  });
}
