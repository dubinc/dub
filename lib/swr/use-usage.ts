import useSWR from "swr";
import { useMemo } from "react";
import { useRouter } from "next/router";
import { fetcher } from "@/lib/utils";
import { UsageProps } from "@/lib/types";
import { getPlanFromUsageLimit } from "@/lib/stripe/constants";

export default function useUsage() {
  const router = useRouter();
  const { slug } = router.query;
  const { data, error } = useSWR<UsageProps>(
    slug ? `/api/projects/${slug}/usage` : `/api/usage`,
    fetcher
  );

  const exceededUsage = useMemo(() => {
    if (data) {
      return slug ? data.ownerExceededUsage : data.usage > data.usageLimit;
    }
  }, [data]);

  const plan = useMemo(() => {
    if (data) {
      return getPlanFromUsageLimit(
        slug ? data.ownerUsageLimit : data.usageLimit
      );
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
