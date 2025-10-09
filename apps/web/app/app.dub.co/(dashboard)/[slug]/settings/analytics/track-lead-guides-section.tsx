"use client";

import useGuide from "@/lib/swr/use-guide";
import { GuideActionButton } from "@/ui/guides/guide-action-button";
import { GuideSelector } from "@/ui/guides/guide-selector";
import { guides as allGuides } from "@/ui/guides/integrations";
import { GuidesMarkdown } from "@/ui/guides/markdown";
import { useSelectedGuide } from "./use-selected-guide";

const TrackLeadsGuidesSection = () => {
  const guides = allGuides.filter((guide) => guide.type === "track-lead");
  const { selectedGuide, setSelectedGuide } = useSelectedGuide({ guides });

  const { loading, guideMarkdown } = useGuide(selectedGuide.key);

  let button;
  let content;

  if (loading) {
    content = (
      <div className="space-y-4">
        <div className="h-6 w-1/2 animate-pulse rounded bg-neutral-200" />
        <div className="h-4 w-full animate-pulse rounded bg-neutral-100" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-neutral-100" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-100" />
      </div>
    );
    button = (
      <div className="h-8 w-24 animate-pulse rounded-md bg-neutral-200" />
    );
  } else if (guideMarkdown) {
    content = <GuidesMarkdown>{guideMarkdown}</GuidesMarkdown>;
    button = (
      <GuideActionButton guide={selectedGuide} markdown={guideMarkdown} />
    );
  } else {
    content = (
      <div className="text-content-subtle flex size-full items-center justify-center text-sm">
        Failed to load guide
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
      <div className="flex items-center justify-between p-3">
        <GuideSelector
          value={selectedGuide}
          onChange={setSelectedGuide}
          guides={guides}
          className="-my-1 -ml-1"
        />

        {button}
      </div>

      <div className="max-w-full rounded-t-xl border-t border-neutral-200 bg-white p-5">
        <div className="mx-auto max-w-2xl">{content}</div>
      </div>
    </div>
  );
};

export default TrackLeadsGuidesSection;
