import { cn } from "@dub/utils";
import { PaginationState } from "@tanstack/react-table";
import { PropsWithChildren } from "react";

const buttonClassName = cn(
  "flex h-7 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-neutral-200 bg-white px-2 text-sm text-neutral-600",
  "outline-none hover:bg-neutral-50 focus-visible:border-neutral-500",
  "disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400 disabled:bg-neutral-100",
);

export function PaginationControls({
  pagination,
  setPagination,
  totalCount,
  unit = (p) => `item${p ? "s" : ""}`,
  className,
  children,
  showTotalCount = true,
}: PropsWithChildren<{
  pagination: PaginationState;
  setPagination: (pagination: PaginationState) => void;
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
          {totalCount === undefined ? (
            <div className="h-5 w-24 animate-pulse rounded-lg bg-neutral-200" />
          ) : (
            <>
              <span className="hidden sm:inline-block">Viewing</span>{" "}
              {totalCount > 0 && (
                <>
                  <span className="font-medium">
                    {(
                      (pagination.pageIndex - 1) * pagination.pageSize +
                      1
                    ).toLocaleString()}
                    -
                    {Math.min(
                      (pagination.pageIndex - 1) * pagination.pageSize +
                        pagination.pageSize,
                      totalCount,
                    ).toLocaleString()}
                  </span>{" "}
                  {showTotalCount && "of "}
                </>
              )}
              {showTotalCount && (
                <span className="font-medium">
                  {totalCount.toLocaleString()}
                </span>
              )}{" "}
              {typeof unit === "function" ? unit(totalCount !== 1) : unit}
            </>
          )}
        </div>
        {children}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={buttonClassName}
          onClick={() =>
            setPagination({
              ...pagination,
              pageIndex: pagination.pageIndex - 1,
            })
          }
          disabled={pagination.pageIndex === 1}
        >
          Previous
        </button>
        <button
          type="button"
          className={buttonClassName}
          onClick={() =>
            setPagination({
              ...pagination,
              pageIndex: pagination.pageIndex + 1,
            })
          }
          disabled={
            !totalCount ||
            (pagination.pageIndex - 1) * pagination.pageSize +
              pagination.pageSize >=
              totalCount
          }
        >
          Next
        </button>
      </div>
    </div>
  );
}
