import { MarkdownDescription } from "./markdown-description";

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
      <MarkdownDescription className="text-[13px] font-medium text-neutral-900">
        {children}
      </MarkdownDescription>
    </div>
  );
}
