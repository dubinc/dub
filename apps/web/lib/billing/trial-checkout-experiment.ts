import { normalizeWorkspaceId } from "@/lib/api/workspaces/workspace-id";
import type { BetaFeatures } from "@/lib/types";

type TrialCheckoutAbVariant = "control" | "treatment";

function hashWorkspaceIdToBucket(workspaceId: string): 0 | 1 {
  let h = 0;
  for (let i = 0; i < workspaceId.length; i++) {
    h = Math.imul(31, h) + workspaceId.charCodeAt(i)!;
    h |= 0;
  }
  return (Math.abs(h) % 2) as 0 | 1;
}

export function getTrialAbVariant(workspaceId: string): TrialCheckoutAbVariant {
  const id = normalizeWorkspaceId(workspaceId);
  return hashWorkspaceIdToBucket(id) === 0 ? "control" : "treatment";
}

export function shouldEnableStripeCheckoutTrial(
  flags: Partial<Record<BetaFeatures, boolean>> | undefined,
  workspaceId: string,
): boolean {
  if (!(flags?.freeTrialCheckout ?? false)) {
    return false;
  }
  return getTrialAbVariant(workspaceId) === "treatment";
}
