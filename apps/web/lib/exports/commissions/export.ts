import { generateRandomString } from "@/lib/api/utils/generate-random-string";
import { exportCsvToStorage } from "@/lib/exports/export-csv-to-storage";
import { generateExportFilename } from "@/lib/exports/generate-export-filename";
import { getCommissionsQuerySchema } from "@/lib/zod/schemas/commissions";
import * as z from "zod/v4";
import { fetchCommissionsBatch } from "./fetch";
import { formatCommissionsForExport } from "./format";

export async function exportCommissions({
  filters,
  columns,
}: {
  filters: Omit<
    z.infer<typeof getCommissionsQuerySchema>,
    "page" | "pageSize" | "startingAfter" | "endingBefore"
  > & {
    programId: string;
  };
  columns: string[];
}) {
  const formattedBatches = async function* () {
    for await (const { commissions } of fetchCommissionsBatch(filters)) {
      yield formatCommissionsForExport(commissions, columns);
    }
  };

  return exportCsvToStorage({
    fileKey: `exports/commissions/${generateRandomString(16)}.csv`,
    fileName: generateExportFilename("commissions"),
    batches: formattedBatches(),
  });
}
