import { MarkdownDescription } from "@/ui/shared/markdown-description";
import { PropsWithChildren } from "react";

export function GroupSettingsRow({
  heading,
  description,
  children,
}: PropsWithChildren<{
  heading: string;
  description: string;
}>) {
  return (
    <div className="grid grid-cols-1 gap-10 px-6 py-8 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <h3 className="text-content-emphasis text-base font-semibold leading-none">
          {heading}
        </h3>
        <MarkdownDescription className="text-content-subtle text-sm">
          {description}
        </MarkdownDescription>
      </div>

      <div>{children}</div>
    </div>
  );
}
