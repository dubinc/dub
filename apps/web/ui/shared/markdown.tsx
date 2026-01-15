"use client";

import { cn } from "@dub/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({
  children,
  className,
  components,
}: {
  children: string;
  className?: string;
  components?: any;
}) {
  return (
    <ReactMarkdown
      className={cn(
        "prose prose-sm prose-neutral max-w-none transition-all",
        "prose-headings:leading-tight",
        "prose-a:font-medium prose-a:text-neutral-900 prose-a:underline-offset-2 prose-a:decoration-dotted prose-a:cursor-alias",
        className,
      )}
      components={{
        a: ({ node, ...props }) => (
          <a {...props} target="_blank" rel="noopener noreferrer" />
        ),
        ...components,
      }}
      remarkPlugins={[remarkGfm] as any}
    >
      {children}
    </ReactMarkdown>
  );
}
