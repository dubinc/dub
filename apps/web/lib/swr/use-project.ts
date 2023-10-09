import { ProjectProps } from "#/lib/types";
import { fetcher } from "@dub/utils";
import { useRouter } from "next/router";
import { useMemo } from "react";
import useSWR from "swr";

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
    },
  );

  const exceededUsage = useMemo(() => {
    if (project) {
      return project.usage > project.usageLimit;
    }
  }, [project]);

  return {
    ...project,
    isOwner: project?.users && project.users[0].role === "owner",
    exceededUsage,
    error,
    loading: !router.isReady || (slug && !project && !error),
  };
}
