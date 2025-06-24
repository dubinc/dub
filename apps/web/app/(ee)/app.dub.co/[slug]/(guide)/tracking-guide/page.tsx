import { Guide } from "@/ui/guides/guide";
import { GuideList } from "@/ui/guides/guide-list";
import { guides, IntegrationGuide } from "@/ui/guides/integrations";
import { readFileSync } from "fs";
import { notFound } from "next/navigation";
import { join } from "path";
import { Suspense } from "react";

export default async function Page({
  searchParams,
}: {
  searchParams: {
    guide: string;
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

    markdown = getMarkdown(selectedGuide.key);

    if (!markdown) {
      notFound();
    }
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div>
        <p className="mb-6 text-sm text-neutral-600">
          Ensure Dub is connected to your app, so you can track your clicks,
          leads, and sales on your program. A developer might be required to
          complete.
        </p>

        <div>
          {selectedGuide ? (
            <Guide markdown={markdown} />
          ) : (
            <GuideList showConnectLaterButton={false} />
          )}
        </div>
      </div>
    </Suspense>
  );
}

function getMarkdown(guideKey: string): string | null {
  const markdownPath = join(
    process.cwd(),
    "integration-guides",
    `${guideKey}.md`,
  );

  try {
    return readFileSync(markdownPath, "utf-8");
  } catch (error) {
    console.warn(`Guide content not found for: ${guideKey}`);
    return null;
  }
}
