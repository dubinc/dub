import AppLayout from "components/layout/app";
import { useRouter } from "next/router";
import useSWR from "swr";
import { fetcher } from "@/lib/utils";
import { ProjectProps } from "@/lib/types";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import CustomDomain from "@/components/app/custom-domain";
import PlanUsage from "@/components/app/plan-usage";
import ErrorPage from "next/error";

export default function ProjectLinks() {
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

  return (
    <AppLayout>
      <div className="h-36 flex items-center bg-white border-b border-gray-200">
        <MaxWidthWrapper>
          <div className="flex justify-between items-center">
            <h1 className="text-2xl text-gray-600">Settings</h1>
          </div>
        </MaxWidthWrapper>
      </div>
      <MaxWidthWrapper>
        <div className="py-10 grid gap-5">
          <CustomDomain domain={project?.domain || ""} />
          <PlanUsage project={project} />
        </div>
      </MaxWidthWrapper>
    </AppLayout>
  );
}
