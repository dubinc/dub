import { useRouter } from "next/router";

import { useMemo } from "react";

import useSWR from "swr";

import { ProjectProps } from "@/lib/types";
import { fetcher } from "@/lib/utils";

export default function useUsage(project: ProjectProps) {
  const router = useRouter();

  const { slug } = router.query as {
    slug: string;
  };

  const { data: usage, error } = useSWR<number>(
    router.isReady &&
      project &&
      `/api/projects/${slug}/domains/${project.domain}/usage`,
    fetcher,
    {
      dedupingInterval: 10000,
    }
  );

  const exceededUsage = useMemo(() => {
    if (usage && project) {
      return usage > project?.usageLimit;
    }
  }, [usage, project]);

  return {
    usage,
    exceededUsage,
    loading: !error && !usage,
    error,
  };
}
