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
        "grid grid-cols-1 gap-10 p-6 sm:grid-cols-2",
        align === "center" && "sm:items-center",
        className,
      )}
    >
      <div className="flex h-full min-w-0 flex-col gap-1">
        <h3 className="text-content-emphasis text-base font-semibold leading-6 tracking-[-0.02em]">
          {heading}
        </h3>
        <MarkdownDescription className="text-content-subtle text-sm font-normal leading-5 tracking-[-0.02em] [&_a]:text-content-subtle [&_a]:decoration-solid [&_a]:underline-offset-auto">
          {description}
        </MarkdownDescription>
        {leftExtra && (
          <div className={cn(leftExtraAlign === "end" && "mt-auto pt-4")}>
            {leftExtra}
          </div>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
