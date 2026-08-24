import { PropsWithChildren, ReactNode } from "react";

export function SectionCard({
  number,
  title,
  children,
}: PropsWithChildren<{
  number: number;
  title: string;
  children?: ReactNode;
}>) {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="flex items-center gap-3.5 px-5 py-5">
        <div className="text-content-emphasis flex size-[42px] shrink-0 items-center justify-center rounded-full bg-neutral-100 text-base font-semibold">
          {number}
        </div>
        <h2 className="text-content-emphasis text-base font-semibold">
          {title}
        </h2>
      </div>
      <div className="border-t border-neutral-200">{children}</div>
    </div>
  );
}
