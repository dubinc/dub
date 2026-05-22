"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { WorkspaceEnvironment } from "@dub/prisma/client";

export function useDashboardBannerVisible() {
  const {
    exceededEvents,
    exceededLinks,
    exceededPayouts,
    paymentFailedAt,
    environment,
    loading,
  } = useWorkspace();

  const isProductionWorkspace = environment === WorkspaceEnvironment.production;

  // Visible in production workspaces
  const isUpgradeBannerVisible =
    (exceededEvents || exceededLinks || exceededPayouts || !!paymentFailedAt) &&
    isProductionWorkspace;

  // Visible in non-production workspaces
  const isEnvironmentBannerVisible = !isProductionWorkspace;

  const hasBanner =
    (isUpgradeBannerVisible || isEnvironmentBannerVisible) && !loading;

  return {
    isUpgradeBannerVisible,
    isEnvironmentBannerVisible,
    hasBanner,
  };
}
