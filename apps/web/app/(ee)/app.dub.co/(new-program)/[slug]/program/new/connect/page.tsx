import { readFileSync } from "fs";
import { notFound } from "next/navigation";
import { join } from "path";
import { StepPage } from "../step-page";
import { guides } from "./constants";
import { PageClient } from "./page-client";
import { IntegrationGuide } from "./types";

function getGuideContent(guideKey: string): string | null {
  const markdownPath = join(process.cwd(), "markdown", `${guideKey}.md`);

  try {
    return readFileSync(markdownPath, "utf-8");
  } catch (error) {
    console.warn(`Guide content not found for: ${guideKey}`);
    return null;
  }
}

export default async function Page({
  searchParams,
}: {
  searchParams: {
    guide: string;
  };
}) {
  let { guide } = searchParams;
  let selectedGuide: IntegrationGuide | null = null;
  let content: string | null = null;

  if (guide) {
    selectedGuide = guides.find((g) => g.key === guide.toLowerCase()) ?? null;

    if (!selectedGuide) {
      notFound();
    }

    content = getGuideContent(selectedGuide.key);

    if (!content) {
      notFound();
    }
  }

  return (
    <StepPage title="Connecting Dub">
      <PageClient guideContent={content} />
    </StepPage>
  );
}
