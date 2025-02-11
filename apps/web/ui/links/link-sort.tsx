import { IconMenu, Popover, Tick, useRouterStuff } from "@dub/ui";
import { cn } from "@dub/utils";
import { ChevronDown, SortDesc } from "lucide-react";
import { useContext, useState } from "react";
import { LinksDisplayContext, sortOptions } from "./links-display-provider";

export default function LinkSort() {
  const { queryParams } = useRouterStuff();

  const [openPopover, setOpenPopover] = useState(false);

  const { sortBy, setSort } = useContext(LinksDisplayContext);
  const selectedSort =
    sortOptions.find((s) => s.slug === sortBy) ?? sortOptions[0];

  return (
    <Popover
      content={
        <div className="w-full p-2 md:w-48">
          {sortOptions.map(({ display, slug }) => (
            <button
              key={slug}
              onClick={() => {
                setSort(slug);
                queryParams({
                  del: [
                    "sort", // Remove legacy query param
                    "page", // Reset pagination
                  ],
                });
                setOpenPopover(false);
              }}
              className="flex w-full items-center justify-between space-x-2 rounded-md px-1 py-2 hover:bg-neutral-100 active:bg-neutral-200"
            >
              <IconMenu
                text={display}
                icon={<SortDesc className="h-4 w-4" />}
              />
              {sortBy === slug && (
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
        className={cn(
          "group flex h-10 cursor-pointer appearance-none items-center gap-x-2 truncate rounded-md border px-3 text-sm outline-none transition-all",
          "border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400",
          "focus-visible:border-neutral-500 data-[state=open]:border-neutral-500 data-[state=open]:ring-4 data-[state=open]:ring-neutral-200",
        )}
      >
        <SortDesc className="h-4 w-4" />
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left text-neutral-900">
          {selectedSort.display || "Sort by"}
        </span>
        <ChevronDown className="h-4 w-4 flex-shrink-0 text-neutral-400 transition-transform duration-75 group-data-[state=open]:rotate-180" />
      </button>
    </Popover>
  );
}
