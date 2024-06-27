import { Button, IconMenu, Popover, Tick, useRouterStuff } from "@dub/ui";
import { cn } from "@dub/utils";
import { ChevronDown, SortDesc } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Sort } from "../shared/icons";

const sortOptions = [
  {
    display: "Date Added",
    slug: "createdAt",
  },
  {
    display: "Number of Clicks",
    slug: "clicks",
  },
  {
    display: "Last Clicked",
    slug: "lastClicked",
  },
];

export default function LinkSort() {
  const [openPopover, setOpenPopover] = useState(false);
  const searchParams = useSearchParams();
  const sort = searchParams?.get("sort");
  const { queryParams } = useRouterStuff();

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
                queryParams({
                  set: {
                    sort: slug,
                  },
                });
                setOpenPopover(false);
              }}
              className="flex w-full items-center justify-between space-x-2 rounded-md px-1 py-2 hover:bg-gray-100 active:bg-gray-200"
            >
              <IconMenu
                text={display}
                icon={<SortDesc className="h-4 w-4" />}
              />
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
      <Button
        variant="secondary"
        onClick={() => setOpenPopover(!openPopover)}
        className="hover:bg-white"
        text={
          <span className="flex items-center gap-3">
            <span>{sort ? selectedSort.display : "Sort"}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-gray-400",
                openPopover ? "rotate-180 transform" : "",
              )}
            />
          </span>
        }
        icon={
          sort ? (
            <SortDesc className="h-4 w-4" />
          ) : (
            <Sort className="h-4 w-4 shrink-0" />
          )
        }
      />
    </Popover>
  );
}
