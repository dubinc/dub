import Stats from "@/components/stats";
import AppLayout from "@/components/layout/app";
import { useRouter } from "next/router";
import useProject from "@/lib/swr/use-project";
import ErrorPage from "next/error";

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
