import { AlertCircleFill, CheckCircleFill } from "./icons";
import { MarkdownDescription } from "./markdown-description";

export function CustomToast({
  variant,
  children,
}: {
  variant?: "success" | "error";
  children: string;
}) {
  const Icon = variant === "error" ? AlertCircleFill : CheckCircleFill;
  return (
    <div className="flex items-start gap-1.5 rounded-lg bg-white p-4 text-sm shadow-[0_4px_12px_#0000001a]">
      <Icon className="mt-0.5 size-[18px] shrink-0 text-black" />
      <MarkdownDescription className="text-[13px] font-medium text-neutral-900">
        {children}
      </MarkdownDescription>
    </div>
  );
}
