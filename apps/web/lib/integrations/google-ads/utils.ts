import { normalizeWorkspaceId } from "@/lib/api/workspaces/workspace-id";
import { GOOGLE_ADS_ALLOWED_WORKSPACE_IDS } from "./constants";

export const isGoogleAdsAllowedWorkspace = (workspaceId: string) =>
  GOOGLE_ADS_ALLOWED_WORKSPACE_IDS.has(normalizeWorkspaceId(workspaceId));

type GoogleAdsEventMapping = {
  conversionAction: string;
  eventNames: string[];
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
