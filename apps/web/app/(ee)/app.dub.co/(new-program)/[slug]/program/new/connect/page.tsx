import { readFileSync } from "fs";
import { notFound } from "next/navigation";
import { join } from "path";
import { Suspense } from "react";
import { StepPage } from "../step-page";
import { guides } from "./integration-guides";
import { PageClient } from "./page-client";
import { IntegrationGuide } from "./types";

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
    <StepPage title="Connecting Dub">
      <Suspense fallback={<div>Loading...</div>}>
        <PageClient markdown={markdown} />
      </Suspense>
    </StepPage>
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
