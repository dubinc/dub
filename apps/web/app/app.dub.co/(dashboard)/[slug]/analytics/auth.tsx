"use client";

import useDomains from "@/lib/swr/use-domains";
import useProject from "@/lib/swr/use-project";
import LinkNotFound from "@/ui/links/link-not-found";
import ProjectExceededUsage from "@/ui/projects/project-exceeded-usage";
import { useSearchParams } from "next/navigation";
import { ReactNode } from "react";

export default function AnalyticsAuth({ children }: { children: ReactNode }) {
  const { exceededUsage } = useProject();
  if (exceededUsage) {
    return <ProjectExceededUsage />;
  }
  const { domains, loading } = useDomains();
  const searchParams = useSearchParams();
  const domain = searchParams?.get("domain");

  if (!loading && domain && !domains?.find((d) => d.slug === domain)) {
    return <LinkNotFound />;
  }

  return children;
}
