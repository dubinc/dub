import useSWR from "swr";
import { useMemo } from "react";
import { fetcher } from "@/lib/utils";
import { UsageProps } from "@/lib/types";
import { getPlanFromUsageLimit, PRO_TIERS } from "@/lib/stripe/constants";

export default function useUsage({ settingsPage } = { settingsPage: false }) {
  const { data, error } = useSWR<UsageProps>(
    `/api/usage${settingsPage ? "?settingsPage=1" : ""}`,
    fetcher
  );

  const exceededUsage = useMemo(() => {
    if (data) {
      return data.usage > data.usageLimit;
    }
  }, [data]);

  const plan = useMemo(() => {
    if (data) {
      return getPlanFromUsageLimit(data.usageLimit);
    }
  }, [data]);

  return {
    data,
    exceededUsage,
    plan,
    loading: !error && !data,
    error,
  };
}
