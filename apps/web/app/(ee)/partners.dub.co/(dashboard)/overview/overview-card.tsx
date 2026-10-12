import { buttonVariants } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { Fragment, ReactNode } from "react";

export function OverviewCard({
  title,
  viewAllHref,
  className,
  testId,
  children,
}: {
  title: ReactNode;
  viewAllHref?: string;
  className?: string;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-testid={testId}
      className={cn(
        "flex flex-col rounded-xl border border-neutral-200 bg-white",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2 px-5 py-4">
        <h2 className="min-h-7 pt-0.5 text-base font-semibold leading-6 text-neutral-800">
          {title}
        </h2>
        {viewAllHref && <ViewAllButton href={viewAllHref} />}
      </div>
      {children}
    </div>
  );
}

export function ViewAllButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: "secondary" }),
        "flex h-7 shrink-0 items-center rounded-lg border px-2.5 text-sm font-medium",
      )}
    >
      View all
    </Link>
  );
}

export function OverviewCardList<T>({
  items,
  rowCount,
  renderItem,
  getKey,
  error,
  emptyState,
}: {
  items?: T[];
  rowCount: number;
  renderItem: (item: T) => ReactNode;
  getKey: (item: T) => string;
  error?: unknown;
  emptyState: { icon: ReactNode; title: string };
}) {
  if (error) {
    return <OverviewCardMessage icon={null} title="Failed to load data" />;
  }

  if (!items) {
    return (
      <div className="flex flex-col px-2 pb-2">
        {[...Array(rowCount)].map((_, idx) => (
          <div key={idx} className="flex h-10 items-center gap-2.5 px-3">
            <div className="size-5 shrink-0 animate-pulse rounded-full bg-neutral-200" />
            <div className="h-4 w-full max-w-32 animate-pulse rounded bg-neutral-200" />
            <div className="ml-auto h-4 w-12 shrink-0 animate-pulse rounded bg-neutral-200" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <OverviewCardMessage {...emptyState} />;
  }

  return (
    <div className="flex flex-col px-2 pb-2">
      {items.map((item, idx) => (
        <Fragment key={getKey(item)}>
          {idx > 0 && (
            <div className="px-2">
              <div className="h-px bg-neutral-100" />
            </div>
          )}
          {renderItem(item)}
        </Fragment>
      ))}
    </div>
  );
}

function OverviewCardMessage({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="flex min-h-60 grow flex-col items-center justify-center gap-2 px-4 pb-4 text-xs text-neutral-500">
      {icon}
      {title}
    </div>
  );
}

export const OVERVIEW_CARD_ROW_CLASSNAME =
  "flex items-center gap-2.5 rounded-lg px-3 py-2.5";
