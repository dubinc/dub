import { ReactNode } from "react";

interface AccountInputGroupProps {
  title: string;
  children: ReactNode;
}

export function AccountInputGroup({ title, children }: AccountInputGroupProps) {
  return (
    <div className="rounded-xl border border-solid border-neutral-200 bg-neutral-100 p-1 pt-0">
      <h3 className="px-1.5 py-2 text-xs font-medium leading-4 text-neutral-500">
        {title}
      </h3>
      <div className="rounded-lg border border-solid border-neutral-200 bg-white p-3">
        {children}
      </div>
    </div>
  );
}
