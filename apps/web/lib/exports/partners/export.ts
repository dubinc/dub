import { generateRandomString } from "@/lib/api/utils/generate-random-string";
import { exportCsvToStorage } from "@/lib/exports/export-csv-to-storage";
import { generateExportFilename } from "@/lib/exports/generate-export-filename";
import { partnersExportQuerySchema } from "@/lib/zod/schemas/partners";
import * as z from "zod/v4";
import { fetchPartnersBatch } from "./fetch";
import { formatPartnersForExport } from "./format";

export async function exportPartners({
  filters,
  columns,
}: {
  filters: Omit<z.infer<typeof partnersExportQuerySchema>, "columns"> & {
    programId: string;
  };
  columns: string[];
}) {
  const formattedBatches = async function* () {
    for await (const { partners } of fetchPartnersBatch(filters)) {
      yield formatPartnersForExport(partners, columns);
    }
  };

  return exportCsvToStorage({
    fileKey: `exports/partners/${generateRandomString(16)}.csv`,
    fileName: generateExportFilename("partners"),
    batches: formattedBatches(),
  });
}
