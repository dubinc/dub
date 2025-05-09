import { PropsWithChildren } from "react";

export function PreviewWindow({
  url,
  children,
}: PropsWithChildren<{ url: string }>) {
  return (
    <div className="flex size-full flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-md">
      <div className="border-b border-neutral-200 px-4 py-2.5">{url}</div>
      <div className="grow overflow-y-auto">{children}</div>
    </div>
  );
}
