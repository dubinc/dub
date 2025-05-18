import { cn } from "@dub/utils";
import ReactMarkdown from "react-markdown";

export const MarkdownDescription = ({
  children,
  className,
}: {
  children: string;
  className?: string;
}) => {
  return (
    <ReactMarkdown
      className={cn(
        "text-sm text-neutral-500",
        "[&_a]:cursor-help [&_a]:text-neutral-600 [&_a]:underline [&_a]:decoration-dotted [&_a]:underline-offset-2 hover:[&_a]:text-neutral-800",
        className,
      )}
      components={{
        a: ({ children, href }) => {
          if (!href) return null;
          return (
            <a href={href} target="_blank">
              {children}
            </a>
          );
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
};
