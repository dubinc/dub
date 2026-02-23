import { get } from "@vercel/edge-config";
import { PartnerBetaFeatures } from "../types";

type PartnerBetaFeaturesRecord = Partial<Record<PartnerBetaFeatures, string[]>>;

export const getPartnerFeatureFlags = async (partnerId: string) => {
  const partnerFeatures: Record<PartnerBetaFeatures, boolean> = {
    postbacks: false,
    stablecoin: false,
  };

  // Return all features as true if edge config is not available
  if (!process.env.EDGE_CONFIG) {
    return Object.fromEntries(
      Object.entries(partnerFeatures).map(([key, _v]) => [key, true]),
    );
  }

  let betaFeatures: PartnerBetaFeaturesRecord | undefined = undefined;

  try {
    betaFeatures = await get("partnerBetaFeatures");
  } catch (e) {
    console.error(`Error getting partner beta features: ${e}`);
  }

  if (!betaFeatures) {
    return partnerFeatures;
  }

  // It should be in the format of
  // { postbacks: ["pn_1", "pn_2"], stablecoin: ["pn_1"] }
  for (const [featureFlag, partnerIds] of Object.entries(betaFeatures)) {
    if (partnerIds?.includes(partnerId)) {
      partnerFeatures[featureFlag] = true;
    }
  }

  return partnerFeatures;
};
