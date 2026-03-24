import { GetLinksForWorkspaceProps } from "@/lib/api/links/get-links-for-workspace";
import { generateRandomString } from "@/lib/api/utils/generate-random-string";
import { exportCsvToStorage } from "@/lib/exports/export-csv-to-storage";
import { generateExportFilename } from "@/lib/exports/generate-export-filename";
import { fetchLinksBatch } from "./fetch";
import { formatLinksForExport } from "./format";

export async function exportLinks({
  filters,
  columns,
}: {
  filters: Omit<
    GetLinksForWorkspaceProps,
    "page" | "pageSize" | "startingAfter" | "endingBefore"
  >;
  columns: string[];
}) {
  const formattedBatches = async function* () {
    for await (const { links } of fetchLinksBatch(filters)) {
      yield formatLinksForExport(links, columns);
    }
  };

  return exportCsvToStorage({
    fileKey: `exports/links/${generateRandomString(16)}.csv`,
    fileName: generateExportFilename("links"),
    batches: formattedBatches(),
  });
}
