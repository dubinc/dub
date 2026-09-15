"use client";

import {
  RichTextArea,
  RichTextFeature,
  RichTextProvider,
  RichTextToolbar,
} from "@dub/ui";
import { cn } from "@dub/utils";

export const LANDER_RICH_TEXT_FEATURES: RichTextFeature[] = [
  "bold",
  "italic",
  "links",
  "lists",
  "tables",
  "quote",
  "code",
];

export function LanderRichTextEditor({
  value,
  onChange,
  placeholder = "Start typing...",
  error,
  editorClassName,
}: {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: boolean;
  editorClassName?: string;
}) {
  return (
    <RichTextProvider
      features={LANDER_RICH_TEXT_FEATURES}
      markdown
      style="relaxed"
      placeholder={placeholder}
      editorClassName={cn(
        "block max-h-64 min-h-16 overflow-auto scrollbar-hide w-full resize-none border-none p-3 text-base sm:text-sm",
        editorClassName,
      )}
      initialValue={value ?? ""}
      onChange={(editor) => onChange((editor as any).getMarkdown() || "")}
    >
      <div
        className={cn(
          "overflow-hidden rounded-md border border-neutral-300 shadow-sm focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-500",
          error &&
            "border-red-600 focus-within:border-red-500 focus-within:ring-red-600",
        )}
      >
        <div className="flex flex-col">
          <RichTextArea />
          <RichTextToolbar className="flex-wrap px-1 pb-1" />
        </div>
      </div>
    </RichTextProvider>
  );
}
