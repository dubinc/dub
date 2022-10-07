import useSWR from "swr";
import { useMemo } from "react";
import { fetcher } from "@/lib/utils";
import { useRouter } from "next/router";
import { ProjectProps } from "@/lib/types";

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

  const isOwner = useMemo(() => {
    if (project && Array.isArray(project.users)) {
      return project.users[0].role === "owner";
    }
  }, [project]);

  return {
    project,
    isOwner,
    loading: !error && !project,
    error,
  };
}
