import { getIntegrationGuideMarkdown } from "@/lib/get-integration-guide-markdown";
import { Guide } from "@/ui/guides/guide";
import { GuideList } from "@/ui/guides/guide-list";
import { guides, IntegrationGuide } from "@/ui/guides/integrations";
import { notFound } from "next/navigation";
import { StepPage } from "../../step-page";

export default async function ConnectGuidesPage({
  params,
}: {
  params: {
    guide?: string[];
  };
}) {
  const { guide } = params;
  console.log("guide", guide);
  let selectedGuide: IntegrationGuide | null = null;
  let markdownContent: string | null = null;

  if (guide && guide.length === 1) {
    selectedGuide =
      guides.find((g) => g.key === guide[0].toLowerCase()) ?? null;

    if (!selectedGuide) {
      notFound();
    }

    markdownContent = await getIntegrationGuideMarkdown(selectedGuide.key);
    console.log("markdown", markdownContent?.slice(0, 100));

    if (!markdownContent) {
      notFound();
    }
  }

  return (
    <StepPage title="Connecting Dub">
      <div>
        <p className="mb-6 text-sm text-neutral-600">
          Ensure Dub is connected to your app, so you can track your clicks,
          leads, and sales on your program. A developer might be required to
          complete.
        </p>

        {selectedGuide && markdownContent ? (
          <Guide markdown={markdownContent} />
        ) : (
          <GuideList />
        )}
      </div>
    </StepPage>
  );
}
