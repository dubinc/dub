"use client";

import useProject from "@/lib/swr/use-project";
import ProjectExceededUsage from "@/ui/projects/project-exceeded-usage";
import { ReactNode } from "react";

export default function AnalyticsAuth({ children }: { children: ReactNode }) {
  const { exceededUsage } = useProject();

  if (exceededUsage) {
    return <ProjectExceededUsage />;
  }

  return children;
}
