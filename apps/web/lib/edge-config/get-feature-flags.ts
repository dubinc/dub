import { get } from "@vercel/edge-config";
import { BetaFeatures } from "../types";

type BetaTesters = Record<BetaFeatures, string[]>;

export const getFeatureFlags = async (workspaceId: string) => {
  const workspaceFeatures: Record<BetaFeatures, boolean> = {
    conversions: false,
    integrations: false,
  };

  workspaceId = workspaceId.startsWith("ws_")
    ? workspaceId
    : `ws_${workspaceId}`;

  if (!process.env.NEXT_PUBLIC_IS_DUB || !process.env.EDGE_CONFIG) {
    return workspaceFeatures;
  }

  let betaTesters: BetaTesters | undefined = undefined;

  try {
    betaTesters = await get("betaTesters");
  } catch (e) {
    console.error(`Error getting beta testers: ${e}`);
    betaTesters = undefined;
  }

  if (betaTesters) {
    for (const [featureFlag, workspaceIds] of Object.entries(betaTesters)) {
      if (workspaceIds.includes(workspaceId)) {
        workspaceFeatures[featureFlag] = true;
      }
    }
  }

  return workspaceFeatures;
};
