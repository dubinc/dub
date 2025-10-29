import { capitalize } from "@dub/utils";

// Generates a sanitized filename for exports with a timestamp
// Example: "Dub Partners Export - 2025-10-27-15-49-12.csv"
export function generateExportFilename(exportType: string): string {
  // Sanitize timestamp: remove colons, replace T with hyphen, remove milliseconds and Z
  const sanitizedTimestamp = new Date()
    .toISOString()
    .replace(/:/g, "-")
    .replace("T", "-")
    .replace(/\.\d{3}Z$/, "");

  return `Dub ${capitalize(exportType)} Export - ${sanitizedTimestamp}.csv`;
}
