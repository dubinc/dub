import { getIntegrationGuideMarkdown } from "@/lib/get-integration-guide-markdown";
import { Guide } from "@/ui/guides/guide";
import { GuideList } from "@/ui/guides/guide-list";
import { guides, IntegrationGuide } from "@/ui/guides/integrations";
import { notFound } from "next/navigation";
import { StepPage } from "../../step-page";

export default async function ConnectGuidesPage({
  params: { guide },
}: {
  params: {
    guide?: string[];
  };
}) {
  let selectedGuide: IntegrationGuide | null = null;
  let markdownContent: string | null = null;

  if (guide && guide.length === 1) {
    selectedGuide =
      guides.find((g) => g.key === guide[0].toLowerCase()) ?? null;

    if (!selectedGuide) {
      notFound();
    }

    markdownContent = await getIntegrationGuideMarkdown(selectedGuide.key);

    if (!markdownContent) {
      notFound();
    }
  }

  return (
    <StepPage title="Set up conversion tracking">
      <div>
        <p className="mb-6 text-sm text-neutral-600">
          Connect Dub to your application and start tracking lead and sale
          conversion events.{" "}
          <span className="font-medium">Estimated time: 1 hour</span>
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
