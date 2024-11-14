import { get } from "@vercel/edge-config";

export const userIsInBeta = async (
  email: string,
  betaFeature: "partnersPortal",
) => {
  if (!process.env.NEXT_PUBLIC_IS_DUB || !process.env.EDGE_CONFIG) {
    return true;
  }

  const betaUsers = await get(betaFeature);

  if (!betaUsers || !Array.isArray(betaUsers)) {
    return false;
  }

  return betaUsers.includes(email);
};
