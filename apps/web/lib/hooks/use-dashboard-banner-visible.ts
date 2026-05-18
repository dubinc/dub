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
  } = useWorkspace();

  const isUpgradeBannerVisible =
    exceededEvents || exceededLinks || exceededPayouts || !!paymentFailedAt;

  const isStagingBannerVisible =
    environment === WorkspaceEnvironment.staging && !isUpgradeBannerVisible;

  const hasBanner = isUpgradeBannerVisible || isStagingBannerVisible;

  return {
    isUpgradeBannerVisible,
    isStagingBannerVisible,
    hasBanner,
  };
}
