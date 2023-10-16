import { ReactNode, Suspense } from "react";
import { getProject } from "@/lib/fetchers";
import LayoutLoader from "@/ui/layout/layout-loader";
import ProjectNotFound from "@/ui/projects/project-not-found";

export default function ProjectLayout({
  params,
  children,
}: {
  params: {
    slug: string;
  };
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <ProjectAuth slug={params.slug}>{children}</ProjectAuth>
    </Suspense>
  );
}

async function ProjectAuth({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const project = await getProject({ slug });

  if (!project) {
    return <ProjectNotFound />;
  }

  return children as JSX.Element;
}
