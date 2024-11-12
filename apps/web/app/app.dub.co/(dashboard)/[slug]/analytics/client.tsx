"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import LayoutLoader from "@/ui/layout/layout-loader";
import WorkspaceExceededClicks from "@/ui/workspaces/workspace-exceeded-clicks";
import { ReactNode } from "react";

export default function AnalyticsClient({
  children,
  eventsPage,
}: {
  children: ReactNode;
  eventsPage?: boolean;
}) {
  const { exceededClicks, loading, plan } = useWorkspace();

  if (loading) {
    return <LayoutLoader />;
  }

  if (exceededClicks && !(plan === "pro" && eventsPage)) {
    return <WorkspaceExceededClicks />;
  }

  return children;
}
