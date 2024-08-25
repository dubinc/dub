import { PaginationState } from "@dub/ui";
import { cn, nFormatter } from "@dub/utils";
import { PropsWithChildren } from "react";

const buttonClassName = cn(
  "flex h-7 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-600",
  "outline-none hover:bg-gray-50 focus-visible:border-gray-500",
  "disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 disabled:bg-gray-100",
);

export function PaginationControls({
  pagination,
  setPagination,
  totalCount,
  unit = (p) => `item${p ? "s" : ""}`,
  className,
  children,
}: PropsWithChildren<{
  pagination: PaginationState;
  setPagination: (pagination: PaginationState) => void;
  totalCount: number;
  unit?: string | ((plural: boolean) => string);
  className?: string;
}>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 text-sm leading-6 text-gray-600",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <div>
          <span className="hidden sm:inline-block">Viewing</span>{" "}
          {totalCount > 0 && (
            <>
              <span className="font-medium">
                {pagination.pageIndex * pagination.pageSize + 1}-
                {Math.min(
                  pagination.pageIndex * pagination.pageSize +
                    pagination.pageSize,
                  totalCount,
                )}
              </span>{" "}
              of{" "}
            </>
          )}
          <span className="font-medium">
            {nFormatter(totalCount, { full: true })}
          </span>{" "}
          {typeof unit === "function" ? unit(totalCount !== 1) : unit}
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
          disabled={pagination.pageIndex === 0}
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
            pagination.pageIndex * pagination.pageSize + pagination.pageSize >=
            totalCount
          }
        >
          Next
        </button>
      </div>
    </div>
  );
}
