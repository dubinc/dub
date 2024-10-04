import { get } from "@vercel/edge-config";
import { BetaFeatures } from "../types";

type BetaFeaturesRecord = Record<BetaFeatures, string[]>;

export const getFeatureFlags = async ({
  workspaceId,
  workspaceSlug,
}: {
  workspaceId?: string;
  workspaceSlug?: string;
}) => {
  if (workspaceId) {
    workspaceId = workspaceId.startsWith("ws_")
      ? workspaceId
      : `ws_${workspaceId}`;
  }

  const workspaceFeatures: Record<BetaFeatures, boolean> = {
    referrals: true,
    webhooks: false,
  };

  if (!process.env.NEXT_PUBLIC_IS_DUB || !process.env.EDGE_CONFIG) {
    return workspaceFeatures;
  }

  let betaFeatures: BetaFeaturesRecord | undefined = undefined;

  try {
    betaFeatures = await get("betaFeatures");
  } catch (e) {
    console.error(`Error getting beta features: ${e}`);
  }

  if (betaFeatures) {
    for (const [featureFlag, workspaceIdsOrSlugs] of Object.entries(
      betaFeatures,
    )) {
      if (
        (workspaceId && workspaceIdsOrSlugs.includes(workspaceId)) ||
        (workspaceSlug && workspaceIdsOrSlugs.includes(workspaceSlug))
      ) {
        workspaceFeatures[featureFlag] = true;
      }
    }
  }

  return workspaceFeatures;
};
