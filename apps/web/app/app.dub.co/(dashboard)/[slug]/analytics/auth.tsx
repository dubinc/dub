"use client";

import useDomains from "@/lib/swr/use-domains";
import useProject from "@/lib/swr/use-project";
import ProjectExceededUsage from "@/ui/projects/project-exceeded-usage";
import { useRouter, useSearchParams } from "next/navigation";
import { ReactNode, useEffect } from "react";

export default function AnalyticsAuth({ children }: { children: ReactNode }) {
  const { slug, exceededUsage } = useProject();
  if (exceededUsage) {
    return <ProjectExceededUsage />;
  }
  const router = useRouter();
  const { primaryDomain } = useDomains();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (!searchParams?.get("domain")) {
      router.replace(`/${slug}/analytics?domain=${primaryDomain}`);
    }
  }, [primaryDomain, router, searchParams]);

  return children;
}
