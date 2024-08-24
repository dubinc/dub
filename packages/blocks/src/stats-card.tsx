import { cn } from "@dub/utils";
import { PropsWithChildren, ReactNode } from "react";

const wrapperClassName =
  "flex justify-between gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 text-left overflow-hidden";

export function StatsCard({
  label,
  demo,
  graphic,
  children,
}: PropsWithChildren<{
  label: string;
  demo?: boolean;
  graphic?: ReactNode;
}>) {
  return (
    <div className={cn(wrapperClassName, demo && "relative pr-8")}>
      {demo && (
        <span className="absolute -right-px top-2 z-10 rounded-l-full border-r border-gray-200 bg-gradient-to-r from-[#743ad5] to-[#DA2778] px-1.5 py-px text-[10px] text-white">
          DEMO DATA
        </span>
      )}
      <div className="flex flex-col gap-2">
        <span className="truncate whitespace-nowrap text-sm text-gray-600">
          {label}
        </span>
        <span className="text-2xl font-medium">{children}</span>
      </div>
      {graphic && (
        <div className="relative flex h-full min-w-0 max-w-[140px] grow items-center justify-end">
          {graphic}
        </div>
      )}
    </div>
  );
}

export function StatsCardSkeleton({ error }: { error?: boolean }) {
  return (
    <div className={wrapperClassName}>
      {error ? (
        <div className="flex h-[60px] w-full items-center justify-center text-sm text-gray-500">
          Failed to load data
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <span className="h-[22px] w-16 animate-pulse rounded-full bg-gray-200" />
          <span className="h-[30px] w-32 animate-pulse rounded-full bg-gray-200" />
        </div>
      )}
    </div>
  );
}
