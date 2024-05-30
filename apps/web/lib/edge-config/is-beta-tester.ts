import { get } from "@vercel/edge-config";

export const isBetaTester = async (workspaceId: string) => {
  workspaceId = workspaceId.startsWith("ws_")
    ? workspaceId
    : `ws_${workspaceId}`;

  if (!process.env.NEXT_PUBLIC_IS_DUB || !process.env.EDGE_CONFIG) {
    return false;
  }

  let betaTesters;
  try {
    betaTesters = await get("betaTesters");
  } catch (e) {
    betaTesters = [];
  }
  return betaTesters.includes(workspaceId);
};
