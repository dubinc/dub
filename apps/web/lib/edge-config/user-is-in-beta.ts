import { get } from "@vercel/edge-config";

export const userIsInBeta = async (
  email: string,
  betaFeature: "partnersPortal",
) => {
  if (!process.env.NEXT_PUBLIC_IS_DUB || !process.env.EDGE_CONFIG) {
    return true;
  }

  const betaFeatures = await get("betaFeatures");

  if (!betaFeatures) {
    return false;
  }

  const betaFeatureList = betaFeatures[betaFeature];

  if (!betaFeatureList) {
    return false;
  }

  return betaFeatureList.includes(email);
};
