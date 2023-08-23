import { PAGINATION_LIMIT } from "#/lib/constants";
import useLinksCount from "#/lib/swr/use-links-count";
import { nFormatter, setQueryString } from "#/lib/utils";
import Number from "#/ui/number";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/router";
import { useMemo } from "react";

export default function LinkPagination() {
  const router = useRouter();
  const currentPage: number =
    router.query.page && typeof router.query.page === "string"
      ? parseInt(router.query.page)
      : 1;

  const { data: count } = useLinksCount();

  const paginatedCount = Math.ceil(count / PAGINATION_LIMIT);
  const paginationArray = !isNaN(paginatedCount)
    ? Array.from(Array(paginatedCount).keys())
    : [];

  const queryWithoutSlug = useMemo(() => {
    const { slug, ...rest } = router.query;
    return rest;
  }, [router.query]);

  return (
    <div className="sticky bottom-0 mt-4 flex h-20 scale-[1.02] flex-col items-center justify-center space-y-2 rounded-t-md border border-gray-200 bg-white shadow-lg">
      <div className="flex items-center space-x-2">
        {currentPage > 1 && paginatedCount > 5 && (
          <button
            onClick={() => {
              setQueryString({
                router,
                param: "page",
                value: (currentPage - 1).toString(),
              });
            }}
            className="flex min-w-[1.5rem] items-center justify-center rounded-md bg-white p-1 transition-all hover:bg-gray-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        {paginationArray.length > 6 ? (
          currentPage > 3 && currentPage < paginationArray.length - 2 ? (
            <>
              <AnchorLink value={1} />
              <Divider />
              <AnchorLink value={currentPage - 1} />
              <AnchorLink value={currentPage} />
              <AnchorLink value={currentPage + 1} />
              <Divider />
              <AnchorLink value={paginationArray.length} />
            </>
          ) : currentPage <= 3 ? (
            <>
              <AnchorLink value={1} />
              <AnchorLink value={2} />
              <AnchorLink value={3} />
              <Divider />
              <AnchorLink value={paginationArray.length} />
            </>
          ) : (
            <>
              <AnchorLink value={1} />
              <Divider />
              <AnchorLink value={paginationArray.length - 2} />
              <AnchorLink value={paginationArray.length - 1} />
              <AnchorLink value={paginationArray.length} />
            </>
          )
        ) : (
          paginationArray.map((i) => <AnchorLink key={i + 1} value={i + 1} />)
        )}
        {currentPage < paginatedCount && paginatedCount > 5 && (
          <button
            onClick={() => {
              setQueryString({
                router,
                param: "page",
                value: (currentPage + 1).toString(),
              });
            }}
            className="flex min-w-[1.5rem] items-center justify-center rounded-md bg-white p-1 transition-all hover:bg-gray-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500">
        Showing {(currentPage - 1) * PAGINATION_LIMIT + 1} -{" "}
        {Math.min(currentPage * PAGINATION_LIMIT, count)} of{" "}
        <Number value={count} unit="links">
          <span>{nFormatter(count)}</span>
        </Number>{" "}
        links
      </p>
    </div>
  );
}

const Divider = () => {
  return <div className="w-6 rounded-lg border border-gray-400" />;
};

const AnchorLink = ({ value }: { value: number }) => {
  const router = useRouter();
  const currentPage: number =
    router.query.page && typeof router.query.page === "string"
      ? parseInt(router.query.page)
      : 1;

  const queryWithoutSlug = useMemo(() => {
    const { slug, ...rest } = router.query;
    return rest;
  }, [router.query]);

  return (
    <button
      className={`${
        value === currentPage ? "text-black" : "text-gray-400"
      } flex min-w-[1.5rem] items-center justify-center rounded-md bg-white p-1 font-semibold transition-all hover:bg-gray-100`}
      onClick={() => {
        setQueryString({
          router,
          param: "page",
          value: value.toString(),
        });
      }}
    >
      {value}
    </button>
  );
};
