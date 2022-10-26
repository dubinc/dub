import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import BlurImage from "@/components/shared/blur-image";
import {
  ChevronDown,
  Sort,
  SortDesc,
  Tick,
  X,
} from "@/components/shared/icons";
import Popover from "@/components/shared/popover";

const sortOptions = [
  {
    display: "Date Added",
    slug: "createdAt",
  },
  {
    display: "Number of Clicks",
    slug: "clicks",
  },
];

export default function LinkSort() {
  const [openPopover, setOpenPopover] = useState(false);
  const router = useRouter();
  const { sort } = router.query as { sort?: string };

  const selectedSort = useMemo(() => {
    return sortOptions.find((s) => s.slug === sort) || sortOptions[0];
  }, [sort]);

  return (
    <Popover
      content={
        <div className="w-full p-2 md:w-48">
          {sortOptions.map(({ display, slug }) => (
            <button
              key={slug}
              onClick={() => {
                let newQuery;
                newQuery = {
                  ...router.query,
                  sort: slug,
                };
                if (slug === "createdAt") {
                  delete newQuery.sort;
                }
                const { slug: omit, ...finalQuery } = newQuery;
                router.push({
                  pathname: `/${router.query.slug || "links"}`,
                  query: finalQuery,
                });
              }}
              className="flex w-full items-center justify-between space-x-2 rounded-md px-1 py-2 hover:bg-gray-100 active:bg-gray-200"
            >
              <div className="flex items-center justify-start space-x-2">
                <SortDesc className="h-4 w-4" />
                <p className="text-sm text-gray-700">{display}</p>
              </div>
              {selectedSort.slug === slug && (
                <Tick className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      }
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
    >
      <button
        onClick={() => setOpenPopover(!openPopover)}
        className="flex w-full items-center justify-between space-x-2 rounded-md bg-white px-3 py-2.5 shadow transition-all duration-75 hover:shadow-md active:scale-95 sm:w-48"
      >
        <div className="flex items-center space-x-2 text-gray-700">
          <Sort className="h-4 w-4 shrink-0" />
          <p className="text-sm">Sort by</p>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-gray-400 ${
            openPopover ? "rotate-180 transform" : ""
          } transition-all duration-75`}
        />
      </button>
    </Popover>
  );
}
