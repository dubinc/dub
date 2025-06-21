"use client";

import usePartnersCount from "@/lib/swr/use-partners-count";

export function useProgramApplicationsCount({
  enabled,
}: {
  enabled?: boolean;
}) {
  const { partnersCount } = usePartnersCount<number | undefined>({
    status: "pending",
    ignoreParams: true,
    enabled,
  });

  return partnersCount;
}
