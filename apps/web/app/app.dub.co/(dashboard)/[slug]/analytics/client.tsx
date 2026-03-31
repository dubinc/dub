"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import LayoutLoader from "@/ui/layout/layout-loader";
import WorkspaceExceededEvents from "@/ui/workspaces/workspace-exceeded-events";
import { ReactNode } from "react";

export default function AnalyticsClient({
  children,
  eventsPage,
}: {
  children: ReactNode;
  eventsPage?: boolean;
}) {
  const { exceededEvents, loading, plan } = useWorkspace();

  if (loading) {
    return <LayoutLoader />;
  }

  if (exceededEvents && !(plan === "pro" && eventsPage)) {
    return <WorkspaceExceededEvents />;
  }

  return children;
}
