import { normalizeWorkspaceId } from "@/lib/api/workspaces/workspace-id";
import { GOOGLE_ADS_ALLOWED_WORKSPACE_IDS } from "./constants";

export const isGoogleAdsAllowedWorkspace = (workspaceId: string) =>
  GOOGLE_ADS_ALLOWED_WORKSPACE_IDS.has(normalizeWorkspaceId(workspaceId));
