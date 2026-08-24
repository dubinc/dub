import { MarkdownDescription } from "@/ui/shared/markdown-description";
import { cn } from "@dub/utils";
import { PropsWithChildren, ReactNode } from "react";

export function TrackingSettingsRow({
  heading,
  description,
  leftExtra,
  leftExtraAlign = "start",
  align = "start",
  children,
  className,
}: PropsWithChildren<{
  heading: string;
  description: string;
  leftExtra?: ReactNode;
  leftExtraAlign?: "start" | "end";
  align?: "start" | "center";
  className?: string;
}>) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 px-5 py-6 sm:grid-cols-3 sm:gap-8",
        align === "center" && "sm:items-center",
        className,
      )}
    >
      <div className="flex h-full flex-col gap-1">
        <h3 className="text-content-emphasis text-sm font-semibold leading-none">
          {heading}
        </h3>
        <MarkdownDescription className="text-content-subtle text-sm">
          {description}
        </MarkdownDescription>
        {leftExtra && (
          <div className={cn(leftExtraAlign === "end" && "mt-auto pt-4")}>
            {leftExtra}
          </div>
        )}
      </div>
      <div className="min-w-0 sm:col-span-2">{children}</div>
    </div>
  );
}
