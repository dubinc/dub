import { cn } from "@dub/utils";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function BlockMarkdown({
  className,
  children,
}: {
  className?: string;
  children: string;
}) {
  return (
    <div
      className={cn(
        "prose prose-neutral max-w-none",
        "prose-headings:leading-tight prose-bullet:text-red-500",
        "prose-a:font-medium prose-a:text-neutral-500 hover:prose-a:text-neutral-600",
        "marker:prose-ul:text-neutral-700 prose-ul:pl-[1.5em] [&_ul>li]:pl-0",
        "prose-table:my-0 prose-table:w-full prose-table:text-sm prose-table:leading-6",
        "prose-thead:border-border-subtle prose-tr:border-border-subtle",
        "prose-th:px-4 prose-th:py-2.5 prose-th:font-medium prose-th:text-content-emphasis",
        "prose-td:px-4 prose-td:py-2.5 prose-td:text-content-default",
        "[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap",
        "[&_td:first-child]:pl-0 [&_th:first-child]:pl-0",
        "[&_td:last-child]:pr-0 [&_th:last-child]:pr-0",
        className,
      )}
      dir="auto"
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto">
              <table {...props} />
            </div>
          ),
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}
