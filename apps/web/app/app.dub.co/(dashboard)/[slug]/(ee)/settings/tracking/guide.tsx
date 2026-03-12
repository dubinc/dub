"use client";

import { GuidesMarkdown } from "@/ui/guides/markdown";
import { use } from "react";

export default function GuideMarkdown({
  guideMarkdown,
}: {
  guideMarkdown: Promise<string | null>;
}) {
  const guide = use(guideMarkdown);

  if (!guide) {
    return null;
  }

  return <GuidesMarkdown>{guide}</GuidesMarkdown>;
}
