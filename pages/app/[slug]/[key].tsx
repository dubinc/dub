import ErrorPage from "next/error";
import { useRouter } from "next/router";

import AppLayout from "@/components/layout/app";
import Stats from "@/components/stats";

import useProject from "@/lib/swr/use-project";

export default function StatsPage() {
  const router = useRouter();
  const { slug } = router.query as {
    slug: string;
  };

  const { project, error } = useProject();

  // handle error page
  if (error && error.status === 404) {
    return <ErrorPage statusCode={404} />;
  }

  return <AppLayout>{project && <Stats domain={project.domain} />}</AppLayout>;
}
