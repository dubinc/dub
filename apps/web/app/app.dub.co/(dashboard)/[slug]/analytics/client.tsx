"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import LayoutLoader from "@/ui/layout/layout-loader";
import WorkspaceExceededClicks from "@/ui/workspaces/workspace-exceeded-clicks";
import { ReactNode } from "react";

export default function AnalyticsClient({ children }: { children: ReactNode }) {
  const { exceededClicks, loading } = useWorkspace();
  if (exceededClicks) {
    return <WorkspaceExceededClicks />;
  }

  if (loading) {
    return <LayoutLoader />;
  }

  return children;
}
