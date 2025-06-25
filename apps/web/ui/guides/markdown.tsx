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
        "prose-headings:font-semibold prose-headings:text-gray-900 prose-headings:border-b prose-headings:border-gray-200 prose-headings:pb-2",
        "prose-h1:text-2xl prose-h1:font-bold prose-h1:mt-8 prose-h1:mb-4",
        "prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-6 prose-h2:mb-3",
        "prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-4 prose-h3:mb-2",
        "prose-h4:text-base prose-h4:font-semibold prose-h4:mt-3 prose-h4:mb-1",
        "prose-p:text-gray-700 prose-p:leading-6 prose-p:mb-4",
        "prose-a:text-neutral-600 prose-a:font-medium prose-a:underline prose-a:underline-offset-2 hover:prose-a:text-neutral-700",
        "prose-strong:text-gray-900 prose-strong:font-semibold",
        "prose-em:text-gray-700 prose-em:italic",
        "prose-code:text-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono",
        "prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200 prose-pre:rounded-lg prose-pre:p-3 prose-pre:overflow-x-auto",
        "prose-pre:code:bg-transparent prose-pre:code:p-0 prose-pre:code:text-sm",
        "prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600",
        "prose-ul:list-disc prose-ul:pl-6 prose-ul:text-gray-700",
        "prose-ol:list-decimal prose-ol:pl-6 prose-ol:text-gray-700",
        "prose-li:mb-1",
        "prose-hr:border-gray-200 prose-hr:my-8",
        "prose-table:border-collapse prose-table:w-full",
        "prose-th:border prose-th:border-gray-300 prose-th:bg-gray-50 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-th:text-gray-900",
        "prose-td:border prose-td:border-gray-300 prose-td:px-3 prose-td:py-2 prose-td:text-gray-700",
        "prose-img:rounded-lg prose-img:border prose-img:border-gray-200",
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
