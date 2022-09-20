import Stats from "@/components/stats";
import AppLayout from "@/components/layout/app";
import { useRouter } from "next/router";
import useSWR from "swr";
import { fetcher } from "@/lib/utils";
import { ProjectProps } from "@/lib/types";
import ErrorPage from "next/error";

export default function StatsPage() {
  const router = useRouter();
  const { slug } = router.query as {
    slug: string;
  };

  const { data: project, error } = useSWR<ProjectProps>(
    router.isReady && `/api/projects/${slug}`,
    fetcher
  );
  // handle error page
  if (error && error.status === 404) {
    return <ErrorPage statusCode={404} />;
  }

  return <AppLayout>{project && <Stats domain={project.domain} />}</AppLayout>;
}
