import { PAGINATION_LIMIT } from "@dub/utils";
import { PropsWithChildren } from "react";
import { Button } from "../button";

export function CardListPagination({
  page,
  onPageChange,
  pageSize = PAGINATION_LIMIT,
  totalCount,
  resourceName = (plural) => `item${plural ? "s" : ""}`,
  children,
}: PropsWithChildren<{
  page: number;
  onPageChange: (fn: (prev: number) => number) => void;
  pageSize?: number;
  totalCount: number;
  resourceName?: (plural: boolean) => string;
}>) {
  return (
    <>
      {/* Placeholder to make room for the floating pagination at the bottom of the list */}
      <div className="h-[90px]" />
      <div className="fixed bottom-4 left-1/2 w-full max-w-[768px] -translate-x-1/2 px-2.5 max-[920px]:bottom-5 max-[920px]:pr-20">
        <nav className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm leading-6 text-gray-600 [filter:drop-shadow(0_5px_8px_#222A351d)]">
          <div className="flex items-center gap-2">
            <div>
              <span className="hidden sm:inline-block">Viewing</span>{" "}
              <span className="font-medium">
                {page * pageSize + (totalCount ? 1 : 0)}-
                {Math.min(page * pageSize + pageSize, totalCount)}
              </span>{" "}
              of{" "}
              <span className="font-medium">{totalCount.toLocaleString()}</span>{" "}
              {resourceName?.(totalCount !== 1) || "items"}
            </div>
            {children}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              text="Previous"
              className="h-7 px-2"
              onClick={() => onPageChange((prev) => prev - 1)}
              disabled={page < 1}
            />
            <Button
              variant="secondary"
              text="Next"
              className="h-7 px-2"
              onClick={() => onPageChange((prev) => prev + 1)}
              disabled={(page + 1) * pageSize >= totalCount}
            />
          </div>
        </nav>
      </div>
    </>
  );
}
