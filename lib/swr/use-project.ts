import { useRouter } from "next/router";

import useSWR from "swr";

import { ProjectProps } from "@/lib/types";
import { fetcher } from "@/lib/utils";

export default function useProject() {
  const router = useRouter();

  const { slug } = router.query as {
    slug: string;
  };

  const { data: project, error } = useSWR<ProjectProps>(
    slug && `/api/projects/${slug}`,
    fetcher,
    {
      dedupingInterval: 30000,
    }
  );

  return {
    project,
    loading: !error && !project,
    error,
  };
}
