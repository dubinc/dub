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
        "prose prose-sm prose-gray max-w-none p-6 transition-all",
        "prose-headings:leading-tight",
        "prose-a:font-medium prose-a:text-neutral-500 prose-a:underline-offset-4 hover:prose-a:text-black",
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
