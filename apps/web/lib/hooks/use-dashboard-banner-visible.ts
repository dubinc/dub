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

  const isUpgradeBannerVisible =
    exceededEvents || exceededLinks || exceededPayouts || !!paymentFailedAt;

  const isEnvironmentBannerVisible =
    environment !== WorkspaceEnvironment.production && !isUpgradeBannerVisible;

  const hasBanner =
    (isUpgradeBannerVisible || isEnvironmentBannerVisible) && !loading;

  return {
    isUpgradeBannerVisible,
    isEnvironmentBannerVisible,
    hasBanner,
  };
}
