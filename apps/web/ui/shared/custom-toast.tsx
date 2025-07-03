import ReactMarkdown from "react-markdown";

export function CustomToast({
  icon: Icon,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  children: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-white p-4 text-sm shadow-[0_4px_12px_#0000001a]">
      {Icon && <Icon className="size-[18px] shrink-0 text-black" />}
      <ReactMarkdown
        className="text-[13px] font-medium text-neutral-900"
        components={{
          a: ({ node, ...props }) => (
            <a
              {...props}
              target="_blank"
              className="text-neutral-500 underline transition-colors hover:text-neutral-800"
            />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
