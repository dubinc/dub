import { cn } from "@dub/utils";
import { PropsWithChildren } from "react";
import { CursorPaginationState } from "./hooks/use-cursor-pagination";

const buttonClassName = cn(
  "flex h-7 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-neutral-200 bg-white px-2 text-sm text-neutral-600",
  "outline-none hover:bg-neutral-50 focus-visible:border-neutral-500",
  "disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400 disabled:bg-neutral-100",
);

export function CursorPaginationControls({
  pagination,
  onNextPage,
  onPreviousPage,
  totalCount,
  unit = (p) => `item${p ? "s" : ""}`,
  className,
  children,
  showTotalCount = true,
}: PropsWithChildren<{
  pagination: CursorPaginationState;
  onNextPage: () => void;
  onPreviousPage: () => void;
  totalCount?: number;
  unit?: string | ((plural: boolean) => string);
  className?: string;
  showTotalCount?: boolean;
}>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 text-sm leading-6 text-neutral-600",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <div>
          {showTotalCount && totalCount !== undefined && (
            <>
              <span className="hidden sm:inline-block">Viewing</span>{" "}
              <span className="font-medium">{totalCount.toLocaleString()}</span>{" "}
            </>
          )}
          {typeof unit === "function" ? unit(totalCount !== 1) : unit}
        </div>
        {children}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={buttonClassName}
          onClick={onPreviousPage}
          disabled={!pagination.hasPreviousPage}
        >
          Previous
        </button>
        <button
          type="button"
          className={buttonClassName}
          onClick={onNextPage}
          disabled={!pagination.hasNextPage}
        >
          Next
        </button>
      </div>
    </div>
  );
}
