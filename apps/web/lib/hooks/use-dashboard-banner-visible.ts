"use client";

import { isProductionEnvironment } from "@/lib/sandbox/environment";
import useWorkspace from "@/lib/swr/use-workspace";
import useWorkspaces from "@/lib/swr/use-workspaces";

export function useDashboardBannerVisible() {
  const {
    exceededEvents,
    exceededLinks,
    exceededPayouts,
    paymentFailedAt,
    subscriptionCanceledAt,
    environment,
    loading,
    slug,
  } = useWorkspace();
  const { workspaces } = useWorkspaces();

  // Prefer the loaded workspace; fall back to the workspaces list so we know
  // whether the env banner should show before /api/workspaces/:slug resolves.
  // That keeps MainNav's mt-12 offset stable during account switches.
  const environmentFromList = workspaces?.find(
    (workspace) => workspace.slug === slug,
  )?.environment;
  const effectiveEnvironment = environment ?? environmentFromList;

  const subscriptionCanceled =
    subscriptionCanceledAt && new Date(subscriptionCanceledAt) < new Date();

  // Visible in production workspaces (needs full workspace usage/billing data).
  const isUpgradeBannerVisible =
    (exceededEvents ||
      exceededLinks ||
      exceededPayouts ||
      !!paymentFailedAt ||
      subscriptionCanceled) &&
    isProductionEnvironment(effectiveEnvironment) &&
    !loading;

  // Visible in non-production workspaces. A missing environment (account
  // settings, or a workspace that isn't in the list yet) is not a
  // staging/sandbox workspace.
  const isEnvironmentBannerVisible =
    Boolean(effectiveEnvironment) &&
    !isProductionEnvironment(effectiveEnvironment);

  const hasBanner = isUpgradeBannerVisible || isEnvironmentBannerVisible;

  return {
    isUpgradeBannerVisible,
    isEnvironmentBannerVisible,
    hasBanner,
  };
}
