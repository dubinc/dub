"use client";

import { Book2Small } from "@dub/ui/icons";
import { useState } from "react";

export type SourceCitation = {
  url: string;
  heading: string;
  type: "docs" | "help";
};

export function SourceCitations({ sources }: { sources: SourceCitation[] }) {
  const [open, setOpen] = useState(false);

  if (!sources.length) return null;

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800"
      >
        <Book2Small className="size-3.5 shrink-0" />
        <span>
          Used {sources.length} source{sources.length > 1 ? "s" : ""}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        >
          <path d="M2 3.5L5 6.5L8 3.5" />
        </svg>
      </button>

      {open && (
        <ul className="mt-1.5 space-y-1 pl-1">
          {sources.map((source) => (
            <li key={source.url}>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-neutral-500 underline decoration-dotted underline-offset-2 hover:text-neutral-700"
              >
                <span className="shrink-0 rounded border border-neutral-200 bg-neutral-100 px-1 py-px text-[10px] font-medium text-neutral-500">
                  {source.type === "help" ? "Help" : "Docs"}
                </span>
                {source.heading}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function extractSources(
  parts: { type: string; [key: string]: unknown }[],
): SourceCitation[] {
  const seen = new Set<string>();
  const sources: SourceCitation[] = [];

  for (const part of parts) {
    if (part.type !== "tool-findRelevantDocs") continue;
    if ((part as any).state !== "output-available") continue;

    const output = (part as any).output;
    if (!Array.isArray(output)) continue;

    for (const r of output) {
      const meta = r?.metadata;
      if (typeof meta?.url !== "string" || typeof meta?.heading !== "string")
        continue;

      const baseUrl = meta.url.split("#")[0];
      if (seen.has(baseUrl)) continue;
      seen.add(baseUrl);

      sources.push({
        url: baseUrl,
        heading: meta.heading,
        type: meta.type ?? "docs",
      });
    }
  }

  return sources;
}
