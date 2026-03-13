import { capitalize } from "@dub/utils";

export function generateExportFilename(exportType: string): string {
  const sanitizedTimestamp = new Date()
    .toISOString()
    .replace(/:/g, "-")
    .replace("T", "-")
    .replace(/\.\d{3}Z$/, "");

  return `Dub ${capitalize(exportType)} Export - ${sanitizedTimestamp}.csv`;
}
