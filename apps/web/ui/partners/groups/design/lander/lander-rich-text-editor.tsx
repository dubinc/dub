"use client";

import {
  RichTextArea,
  RichTextFeature,
  RichTextProvider,
  RichTextToolbar,
  useRichTextLength,
} from "@dub/ui";
import { cn, nFormatter } from "@dub/utils";
import { useEffect, useRef } from "react";

export const LANDER_RICH_TEXT_FEATURES: RichTextFeature[] = [
  "headings",
  "bold",
  "italic",
  "strike",
  "links",
  "lists",
  "tables",
  "quote",
  "code",
];

export function LanderRichTextEditor({
  id,
  value,
  onChange,
  placeholder = "Start typing...",
  error,
  editorClassName,
  maxLength,
  onTextLengthChange,
}: {
  id?: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: boolean;
  editorClassName?: string;
  maxLength?: number;
  onTextLengthChange?: (length: number) => void;
}) {
  return (
    <RichTextProvider
      features={LANDER_RICH_TEXT_FEATURES}
      markdown
      style="relaxed"
      placeholder={placeholder}
      editorProps={id ? { attributes: { id } } : undefined}
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
      <TextLength maxLength={maxLength} onChange={onTextLengthChange} />
    </RichTextProvider>
  );
}

function TextLength({
  maxLength,
  onChange,
}: {
  maxLength?: number;
  onChange?: (length: number) => void;
}) {
  const length = useRichTextLength();

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => onChangeRef.current?.(length), [length]);

  return maxLength === undefined ? null : (
    <div className="mt-1 text-left">
      <span className="text-content-subtle text-xs tabular-nums">
        {nFormatter(length, { full: true })} /{" "}
        {nFormatter(maxLength, { full: true })}
      </span>
    </div>
  );
}
