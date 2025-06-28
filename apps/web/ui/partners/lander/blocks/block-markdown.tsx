import { cn } from "@dub/utils";
import Markdown from "react-markdown";

export function BlockMarkdown({
  className,
  children,
}: {
  className?: string;
  children: string;
}) {
  return (
    <Markdown
      className={cn(
        "prose prose-neutral max-w-none",
        "prose-headings:leading-tight prose-bullet:text-red-500",
        "prose-a:font-medium prose-a:text-neutral-500 hover:prose-a:text-neutral-600",
        "marker:prose-ul:text-neutral-700 prose-ul:pl-[1.5em] [&_ul>li]:pl-0",
        className,
      )}
      components={{
        a: ({ node, ...props }) => (
          <a {...props} target="_blank" rel="noopener noreferrer" />
        ),
      }}
    >
      {children}
    </Markdown>
  );
}
