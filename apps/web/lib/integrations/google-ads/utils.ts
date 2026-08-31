import { normalizeWorkspaceId } from "@/lib/api/workspaces/workspace-id";
import { GOOGLE_ADS_ALLOWED_WORKSPACE_IDS } from "./constants";

export const isGoogleAdsAllowedWorkspace = (workspaceId: string) =>
  GOOGLE_ADS_ALLOWED_WORKSPACE_IDS.has(normalizeWorkspaceId(workspaceId));

type GoogleAdsEventMapping = {
  conversionAction: string;
  eventNames: string[];
};

export const findDuplicateMappingEventNames = (
  mappings: Pick<GoogleAdsEventMapping, "eventNames">[],
) => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const mapping of mappings) {
    for (const eventName of mapping.eventNames) {
      if (seen.has(eventName)) {
        duplicates.add(eventName);
      }
      seen.add(eventName);
    }
  }

  return [...duplicates];
};

export const getGoogleAdsEventMappingsError = (
  mappings: GoogleAdsEventMapping[],
) => {
  const duplicateEventNames = findDuplicateMappingEventNames(mappings);
  if (duplicateEventNames.length > 0) {
    return `Each event name can only be mapped to one conversion action: ${duplicateEventNames.join(", ")}`;
  }

  const conversionActions = mappings
    .map((mapping) => mapping.conversionAction)
    .filter(Boolean);
  if (new Set(conversionActions).size !== conversionActions.length) {
    return "Each conversion action can only be used once.";
  }

  const catchAllCount = mappings.filter(
    (mapping) => mapping.conversionAction && mapping.eventNames.length === 0,
  ).length;
  if (catchAllCount > 1) {
    return "Only one conversion action can receive unmatched events.";
  }

  return null;
};

// Prefer a mapping whose eventNames includes the event, then a catch-all
// mapping with an empty eventNames list. Returns null when nothing matches.
export const resolveGoogleAdsConversionMapping = ({
  mappings,
  eventName,
}: {
  mappings: GoogleAdsEventMapping[];
  eventName?: string | null;
}): GoogleAdsEventMapping | null => {
  if (!mappings.length) {
    return null;
  }

  if (eventName) {
    const specific = mappings.find((mapping) =>
      mapping.eventNames.includes(eventName),
    );

    if (specific) {
      return specific;
    }
  }

  return mappings.find((mapping) => mapping.eventNames.length === 0) ?? null;
};
