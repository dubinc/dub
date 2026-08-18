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
          table: ({ node, className, ...props }) => (
            <div className="my-6 max-w-full overflow-x-auto rounded-xl border border-neutral-200">
              <table
                className={cn(
                  "my-0 w-full border-separate border-spacing-0 text-left text-[0.95rem]",
                  "[&_th]:border-b [&_th]:border-r [&_th]:border-neutral-200 [&_th]:bg-neutral-50 [&_th]:!px-4 [&_th]:py-3 [&_th]:align-top [&_th]:font-semibold [&_th]:text-neutral-900",
                  "[&_td]:border-b [&_td]:border-r [&_td]:border-neutral-200 [&_td]:!px-4 [&_td]:py-3 [&_td]:align-top [&_td]:text-neutral-600",
                  "[&_td:last-child]:border-r-0 [&_th:last-child]:border-r-0",
                  "[&>:last-child>tr:last-child>*]:border-b-0",
                  className,
                )}
                {...props}
              />
            </div>
          ),
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}
