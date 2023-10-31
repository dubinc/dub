"use client";

import useDomains from "@/lib/swr/use-domains";
import useProject from "@/lib/swr/use-project";
import LinkNotFound from "@/ui/links/link-not-found";
import ProjectExceededUsage from "@/ui/projects/project-exceeded-usage";
import { useRouter, useSearchParams } from "next/navigation";
import { ReactNode, useEffect } from "react";

export default function AnalyticsAuth({ children }: { children: ReactNode }) {
  const { slug, exceededUsage } = useProject();
  if (exceededUsage) {
    return <ProjectExceededUsage />;
  }
  const router = useRouter();
  const { domains, primaryDomain, loading } = useDomains();
  const searchParams = useSearchParams();
  const domain = searchParams?.get("domain");

  // TODO: remove this after we support project level analytics
  useEffect(() => {
    if (!domain) {
      router.replace(`/${slug}/analytics?domain=${primaryDomain}`);
    }
  }, [primaryDomain, router, domain]);

  if (!loading && domain && !domains?.find((d) => d.slug === domain)) {
    return <LinkNotFound />;
  }
  return children;
}
