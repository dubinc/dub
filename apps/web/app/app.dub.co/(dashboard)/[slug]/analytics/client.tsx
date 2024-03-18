"use client";

import useDomains from "@/lib/swr/use-domains";
import useWorkspace from "@/lib/swr/use-workspace";
import LayoutLoader from "@/ui/layout/layout-loader";
import LinkNotFound from "@/ui/links/link-not-found";
import WorkspaceExceededClicks from "@/ui/workspaces/workspace-exceeded-clicks";
import { useSearchParams } from "next/navigation";
import { ReactNode } from "react";

export default function AnalyticsClient({ children }: { children: ReactNode }) {
  const { exceededClicks, loading } = useWorkspace();
  if (exceededClicks) {
    return <WorkspaceExceededClicks />;
  }
  const { allDomains, loading: loadingDomains } = useDomains();
  const searchParams = useSearchParams();
  const domain = searchParams?.get("domain");

  if (loading || loadingDomains) {
    return <LayoutLoader />;
  }
  if (
    allDomains?.length === 0 ||
    (domain && !allDomains?.find((d) => d.slug === domain))
  ) {
    return <LinkNotFound />;
  }

  return children;
}
