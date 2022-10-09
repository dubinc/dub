import { useMemo } from "react";
import useSWR from "swr";
import { PRO_TIERS, getPlanFromUsageLimit } from "@/lib/stripe/constants";
import { UsageProps } from "@/lib/types";
import { fetcher } from "@/lib/utils";

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
