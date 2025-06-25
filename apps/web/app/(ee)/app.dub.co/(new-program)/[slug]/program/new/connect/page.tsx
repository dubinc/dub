import { getIntegrationGuideMarkdown } from "@/lib/get-integration-guide-markdown";
import { Guide } from "@/ui/guides/guide";
import { GuideList } from "@/ui/guides/guide-list";
import { guides, IntegrationGuide } from "@/ui/guides/integrations";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StepPage } from "../step-page";

export default async function Page({
  searchParams,
}: {
  searchParams: {
    guide?: string;
  };
}) {
  let { guide } = searchParams;
  let selectedGuide: IntegrationGuide | null = null;
  let markdown: string | null = null;

  if (guide) {
    selectedGuide = guides.find((g) => g.key === guide.toLowerCase()) ?? null;

    if (!selectedGuide) {
      notFound();
    }

    markdown = await getIntegrationGuideMarkdown(selectedGuide.key);

    if (!markdown) {
      notFound();
    }
  }

  return (
    <StepPage title="Connecting Dub">
      <Suspense fallback={<div>Loading...</div>}>
        <div>
          <p className="mb-6 text-sm text-neutral-600">
            Ensure Dub is connected to your app, so you can track your clicks,
            leads, and sales on your program. A developer might be required to
            complete.
          </p>

          <div>
            {selectedGuide ? <Guide markdown={markdown} /> : <GuideList />}
          </div>
        </div>
      </Suspense>
    </StepPage>
  );
}
