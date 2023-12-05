"use client";

import useDomains from "@/lib/swr/use-domains";
import useProject from "@/lib/swr/use-project";
import LayoutLoader from "@/ui/layout/layout-loader";
import LinkNotFound from "@/ui/links/link-not-found";
import ProjectExceededUsage from "@/ui/projects/project-exceeded-usage";
import { useSearchParams } from "next/navigation";
import { ReactNode } from "react";

export default function AnalyticsClient({ children }: { children: ReactNode }) {
  const { exceededUsage, loading } = useProject();
  if (exceededUsage) {
    return <ProjectExceededUsage />;
  }
  const { domains, loading: loadingDomains } = useDomains();
  const searchParams = useSearchParams();
  const domain = searchParams?.get("domain");

  if (loading || loadingDomains) {
    return <LayoutLoader />;
  }
  if (
    domains.length === 0 ||
    (domain && !domains?.find((d) => d.slug === domain))
  ) {
    return <LinkNotFound />;
  }

  return children;
}
