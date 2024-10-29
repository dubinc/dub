import { get } from "@vercel/edge-config";
import { BetaFeatures } from "../types";

type BetaFeaturesRecord = Record<BetaFeatures, string[]>;

export const getFeatureFlags = async ({
  workspaceId,
  workspaceSlug,
  userEmail,
}: {
  workspaceId?: string;
  workspaceSlug?: string;
  userEmail?: string;
}) => {
  if (workspaceId) {
    workspaceId = workspaceId.startsWith("ws_")
      ? workspaceId
      : `ws_${workspaceId}`;
  }

  const workspaceFeatures: Record<BetaFeatures, boolean> = {
    referrals: false,
    webhooks: false,
    noDubLink: false,
    partnersPortal: false,
  };

  if (!process.env.NEXT_PUBLIC_IS_DUB || !process.env.EDGE_CONFIG) {
    // return all features as true if edge config is not available
    return Object.fromEntries(
      Object.entries(workspaceFeatures).map(([key, _v]) => [key, true]),
    );
  } else if (!workspaceId && !workspaceSlug) {
    return workspaceFeatures;
  }

  let betaFeatures: BetaFeaturesRecord | undefined = undefined;

  try {
    betaFeatures = await get("betaFeatures");
  } catch (e) {
    console.error(`Error getting beta features: ${e}`);
  }

  if (betaFeatures) {
    for (const [featureFlag, identifiers] of Object.entries(betaFeatures)) {
      if (
        (workspaceId && identifiers.includes(workspaceId)) ||
        (workspaceSlug && identifiers.includes(workspaceSlug)) ||
        (userEmail && identifiers.includes(userEmail))
      ) {
        workspaceFeatures[featureFlag] = true;
      }
    }
  }

  return workspaceFeatures;
};
