import { ParsedFilter } from "@dub/utils";

/**
 * Prepare trigger and region filters for Tinybird pipes.
 * Handles backward compatibility for qr parameter and region splitting.
 */
export function prepareFiltersForPipe(params: {
  qr?: boolean;
  trigger?: ParsedFilter;
  region?: string | ParsedFilter;
  country?: ParsedFilter;
}) {
  // Handle qr backward compatibility
  let triggerForPipe = params.trigger;
  if (params.qr && !params.trigger) {
    triggerForPipe = {
      operator: "IS" as const,
      sqlOperator: "IN" as const,
      values: ["qr"],
    };
  }

  // Handle region split (format: "US-CA")
  let countryForPipe = params.country;
  let regionForPipe = params.region;
  if (params.region && typeof params.region === "string") {
    const split = params.region.split("-");
    countryForPipe = {
      operator: "IS" as const,
      sqlOperator: "IN" as const,
      values: [split[0]],
    };
    regionForPipe = split[1];
  }

  return { triggerForPipe, countryForPipe, regionForPipe };
}

/**
 * Extract workspace link filters (domain, tagIds, folderId, root) into
 * separate values and operators for Tinybird.
 *
 * These filters are applied on the workspace_links node in Tinybird,
 * so they need to be passed as separate parameters (not in the filters JSON).
 */
export function extractWorkspaceLinkFilters(params: {
  domain?: ParsedFilter;
  tagIds?: ParsedFilter;
  folderId?: ParsedFilter;
  root?: ParsedFilter;
}) {
  const extractFilter = (filter?: ParsedFilter) => ({
    values: filter?.values,
    operator: (filter?.sqlOperator === "NOT IN" ? "NOT IN" : "IN") as
      | "IN"
      | "NOT IN",
  });

  const domain = extractFilter(params.domain);
  const tagIds = extractFilter(params.tagIds);
  const folderId = extractFilter(params.folderId);
  const root = extractFilter(params.root);

  return {
    domain: domain.values,
    domainOperator: domain.operator,
    tagIds: tagIds.values,
    tagIdsOperator: tagIds.operator,
    folderId: folderId.values,
    folderIdOperator: folderId.operator,
    root: root.values,
    rootOperator: root.operator,
  };
}
