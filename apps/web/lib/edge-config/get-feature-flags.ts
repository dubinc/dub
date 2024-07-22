import { get } from "@vercel/edge-config";
import { BetaFeatures } from "../types";

type BetaFeaturesRecord = Record<BetaFeatures, string[]>;

export const getFeatureFlags = async (workspaceId: string) => {
  const workspaceFeatures: Record<BetaFeatures, boolean> = {
    conversions: false,
    integrations: false,
    dublink: false,
  };

  workspaceId = workspaceId.startsWith("ws_")
    ? workspaceId
    : `ws_${workspaceId}`;

  if (!process.env.NEXT_PUBLIC_IS_DUB || !process.env.EDGE_CONFIG) {
    return workspaceFeatures;
  }

  let betaFeatures: BetaFeaturesRecord | undefined = undefined;

  try {
    betaFeatures = await get("betaFeatures");
  } catch (e) {
    console.error(`Error getting beta features: ${e}`);
    betaFeatures = undefined;
  }

  if (betaFeatures) {
    for (const [featureFlag, workspaceIds] of Object.entries(betaFeatures)) {
      if (workspaceIds.includes(workspaceId)) {
        workspaceFeatures[featureFlag] = true;
      }
    }
  }

  return workspaceFeatures;
};
