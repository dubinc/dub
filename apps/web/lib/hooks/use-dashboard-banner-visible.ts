"use client";

import { isProductionEnvironment } from "@/lib/sandbox/workspace-guards";
import useWorkspace from "@/lib/swr/use-workspace";

export function useDashboardBannerVisible() {
  const {
    exceededEvents,
    exceededLinks,
    exceededPayouts,
    paymentFailedAt,
    environment,
    loading,
  } = useWorkspace();

  // Visible in production workspaces
  const isUpgradeBannerVisible =
    (exceededEvents || exceededLinks || exceededPayouts || !!paymentFailedAt) &&
    isProductionEnvironment(environment) &&
    !loading;

  // Visible in non-production workspaces
  const isEnvironmentBannerVisible =
    !isProductionEnvironment(environment) && !loading;

  const hasBanner = isUpgradeBannerVisible || isEnvironmentBannerVisible;

  return {
    isUpgradeBannerVisible,
    isEnvironmentBannerVisible,
    hasBanner,
  };
}
