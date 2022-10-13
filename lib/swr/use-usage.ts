import { useRouter } from "next/router";
import { useMemo } from "react";
import useSWR from "swr";
import { getPlanFromUsageLimit } from "@/lib/stripe/constants";
import { UsageProps } from "@/lib/types";
import { fetcher } from "@/lib/utils";

export default function useUsage() {
  const router = useRouter();
  const { slug } = router.query;
  const { data, error } = useSWR<UsageProps>(
    slug ? `/api/projects/${slug}/usage` : `/api/usage`,
    fetcher,
  );

  const exceededUsage = useMemo(() => {
    if (data) {
      return slug ? data.ownerExceededUsage : data.usage > data.usageLimit;
    }
  }, [data]);

  const plan = useMemo(() => {
    if (data) {
      return getPlanFromUsageLimit(
        slug ? data.ownerUsageLimit : data.usageLimit,
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
