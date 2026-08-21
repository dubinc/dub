import { VALID_ANALYTICS_ENDPOINTS } from "@/lib/analytics/constants";
import { getAnalytics } from "@/lib/analytics/get-analytics";
import {
  AnalyticsFilters,
  AnalyticsGroupByOptions,
} from "@/lib/analytics/types";
import { convertToCSV } from "@/lib/analytics/utils/convert-to-csv";
import JSZip from "jszip";

const DEFAULT_SKIP_ENDPOINTS = ["count"] as const;

export const PARTNER_PROFILE_SKIP_ENDPOINTS = [
  "count",
  "top_partners",
  "top_groups",
  "top_partner_tags",
  "top_folders",
  "top_link_tags",
] as const;

type ExportAnalyticsToZipOptions = {
  params: AnalyticsFilters;
  workspaceId: string;
  useComposite: boolean;
  skipTopLinksForSingleLink?: boolean;
  skipEndpoints?: readonly AnalyticsGroupByOptions[];
  getAnalyticsParams?: (
    endpoint: AnalyticsGroupByOptions,
  ) => Partial<AnalyticsFilters>;
  getDataAvailableFrom?: (
    endpoint: AnalyticsGroupByOptions,
  ) => Date | undefined;
  formatRows?: (rows: Record<string, unknown>[]) => Record<string, unknown>[];
};

export function getAnalyticsExportEndpoints({
  skipEndpoints = DEFAULT_SKIP_ENDPOINTS,
  skipTopLinksForSingleLink = false,
}: Pick<
  ExportAnalyticsToZipOptions,
  "skipEndpoints" | "skipTopLinksForSingleLink"
>) {
  const skipSet = new Set<string>(skipEndpoints);

  return VALID_ANALYTICS_ENDPOINTS.filter((endpoint) => {
    if (skipSet.has(endpoint)) return false;
    if (skipTopLinksForSingleLink && endpoint === "top_links") return false;
    return true;
  });
}

export async function exportAnalyticsToZip({
  params,
  workspaceId,
  useComposite,
  skipTopLinksForSingleLink = false,
  skipEndpoints = DEFAULT_SKIP_ENDPOINTS,
  getAnalyticsParams,
  getDataAvailableFrom,
  formatRows,
}: ExportAnalyticsToZipOptions) {
  const zip = new JSZip();
  const endpoints = getAnalyticsExportEndpoints({
    skipEndpoints,
    skipTopLinksForSingleLink,
  });

  for (const endpoint of endpoints) {
    const response = await getAnalytics({
      ...params,
      ...getAnalyticsParams?.(endpoint),
      workspaceId,
      groupBy: endpoint,
      event: useComposite ? "composite" : params.event,
      isDeprecatedClicksEndpoint: false,
      ...(getDataAvailableFrom?.(endpoint) && {
        dataAvailableFrom: getDataAvailableFrom(endpoint),
      }),
    });

    if (!response || (Array.isArray(response) && response.length === 0)) {
      continue;
    }

    const rows = formatRows
      ? formatRows(response as Record<string, unknown>[])
      : (response as Record<string, unknown>[]);

    zip.file(`${endpoint}.csv`, convertToCSV(rows));
  }

  return zip.generateAsync({ type: "nodebuffer" });
}
