import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import Link from "next/link";
import { Suspense } from "react";
import WorkspaceAnalyticsPageClient from "./page-client";

export default function WorkspaceAnalyticsPage() {
  return (
    <PageContent
      title="Analytics"
      controls={
        <Link
          href="https://dub.co/docs/partners/quickstart"
          target="_blank"
          className="text-content-emphasis border-border-subtle rounded-lg border px-3 py-1.5 text-sm font-medium"
        >
          Docs ↗
        </Link>
      }
    >
      <PageWidthWrapper className="max-w-[800px] pb-20">
        <Suspense>
          <WorkspaceAnalyticsPageClient />
        </Suspense>
      </PageWidthWrapper>
    </PageContent>
  );
}
