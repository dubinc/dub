"use client";

import { isProductionEnvironment } from "@/lib/sandbox/environment";
import useWorkspace from "@/lib/swr/use-workspace";

export function useDashboardBannerVisible() {
  const {
    exceededEvents,
    exceededLinks,
    exceededPayouts,
    paymentFailedAt,
    subscriptionCanceledAt,
    environment,
    loading,
  } = useWorkspace();

  const subscriptionCanceled =
    subscriptionCanceledAt && new Date(subscriptionCanceledAt) < new Date();

  // Visible in production workspaces
  const isUpgradeBannerVisible =
    (exceededEvents ||
      exceededLinks ||
      exceededPayouts ||
      !!paymentFailedAt ||
      subscriptionCanceled) &&
    isProductionEnvironment(environment) &&
    !loading;

  // Visible in non-production workspaces. A missing environment (account
  // settings, or a failed workspace fetch) is not a staging/sandbox workspace.
  const isEnvironmentBannerVisible =
    Boolean(environment) && !isProductionEnvironment(environment) && !loading;

  const hasBanner = isUpgradeBannerVisible || isEnvironmentBannerVisible;

  return {
    isUpgradeBannerVisible,
    isEnvironmentBannerVisible,
    hasBanner,
  };
}
