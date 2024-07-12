import { Button } from "@dub/ui";
import usePagination from "../analytics/events/use-pagination";

export default function Pagination({
  pageSize,
  totalCount,
}: {
  pageSize: number;
  totalCount: number;
}) {
  const { pagination, setPagination } = usePagination(pageSize);

  return (
    <div className="sticky bottom-0 flex items-center justify-between rounded-b-[inherit] border-t border-gray-200 bg-white px-4 py-3.5 text-sm leading-6 text-gray-600">
      <div>
        <span className="hidden sm:inline-block">Viewing</span>{" "}
        <span className="font-medium">
          {pagination.pageIndex * pagination.pageSize + 1}-
          {Math.min(
            pagination.pageIndex * pagination.pageSize + pagination.pageSize,
            totalCount,
          )}
        </span>{" "}
        of <span className="font-medium">{totalCount}</span> domains
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          text="Previous"
          className="h-7 px-2"
          onClick={() =>
            setPagination({
              pageIndex: pagination.pageIndex - 1,
              pageSize: pagination.pageSize,
            })
          }
          disabled={pagination.pageIndex === 0}
        />
        <Button
          variant="secondary"
          text="Next"
          className="h-7 px-2"
          onClick={() =>
            setPagination({
              pageIndex: pagination.pageIndex + 1,
              pageSize: pagination.pageSize,
            })
          }
          disabled={
            pagination.pageIndex * pagination.pageSize + pagination.pageSize >=
            totalCount
          }
        />
      </div>
    </div>
  );
}
