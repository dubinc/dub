import { getProject } from "#/lib/fetchers";
import LayoutLoader from "#/ui/layout/layout-loader";
import ProjectExceededUsage from "#/ui/layout/project-exceeded-usage";
import ProjectNotFound from "#/ui/layout/project-not-found";
import { Suspense } from "react";

export default function ProjectAnalytics({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <AnalyticsAuth slug={params.slug}>
        <div></div>
      </AnalyticsAuth>
    </Suspense>
  );
}

async function AnalyticsAuth({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const project = await getProject({ slug });

  if (!project) {
    return <ProjectNotFound />;
  }

  if (project.usage > project.usageLimit) {
    return <ProjectExceededUsage />;
  }

  return children as JSX.Element;
}
