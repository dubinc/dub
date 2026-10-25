"use client";

import useWorkspace from "@/lib/swr/use-workspace";

export function useDashboardBannerVisible() {
  const {
    exceededEvents,
    exceededLinks,
    paymentFailedAt,
    subscriptionCanceledAt,
    loading,
  } = useWorkspace();

  const subscriptionCanceled =
    subscriptionCanceledAt && new Date(subscriptionCanceledAt) < new Date();

  const isUpgradeBannerVisible =
    (exceededEvents ||
      exceededLinks ||
      !!paymentFailedAt ||
      subscriptionCanceled) &&
    !loading;

  return {
    isUpgradeBannerVisible,
    hasBanner: isUpgradeBannerVisible,
  };
}
