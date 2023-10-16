"use client";

import useProject from "@/lib/swr/use-project";
import LayoutLoader from "@/ui/layout/layout-loader";
import ProjectNotFound from "@/ui/projects/project-not-found";
import { ReactNode } from "react";

export default function ProjectAuth({ children }: { children: ReactNode }) {
  const { loading, error } = useProject();

  if (loading) {
    return <LayoutLoader />;
  }

  if (error) {
    return <ProjectNotFound />;
  }

  return children;
}
