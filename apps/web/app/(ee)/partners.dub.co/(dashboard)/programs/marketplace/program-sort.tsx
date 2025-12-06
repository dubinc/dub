import {
  Calendar6,
  IconMenu,
  Popover,
  SortAlphaAscending,
  SortAlphaDescending,
  Star,
  Tick,
  useRouterStuff,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

const programSortOptions = [
  {
    icon: Star,
    label: "Most popular",
    value: "popularity",
    order: "desc",
  },
  {
    icon: Calendar6,
    label: "Newest",
    value: "createdAt",
    order: "desc",
  },
  {
    icon: SortAlphaDescending,
    label: "Name A-Z",
    value: "name",
    order: "asc",
  },
  {
    icon: SortAlphaAscending,
    label: "Name Z-A",
    value: "name",
    order: "desc",
  },
] as const;

export default function ProgramSort() {
  const { queryParams, searchParams } = useRouterStuff();

  const [openPopover, setOpenPopover] = useState(false);

  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const selectedSort =
    programSortOptions.find(
      (s) => s.value === searchParams.get("sortBy") && s.order === sortOrder,
    ) ?? programSortOptions[0];

  return (
    <Popover
      content={
        <div className="w-full p-2 md:w-48">
          {programSortOptions.map(({ label, value, order, icon: Icon }) => (
            <button
              key={`${value}-${order}`}
              onClick={() => {
                queryParams({
                  set: {
                    sortBy: value,
                    sortOrder: order,
                  },
                  del: "page",
                });
                setOpenPopover(false);
              }}
              className="flex w-full items-center justify-between space-x-2 rounded-md px-1 py-2 hover:bg-neutral-100 active:bg-neutral-200"
            >
              <IconMenu text={label} icon={<Icon className="size-4" />} />
              {value === selectedSort.value && order === selectedSort.order && (
                <Tick className="size-4" aria-hidden="true" />
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
          "group flex h-9 cursor-pointer appearance-none items-center gap-x-2 truncate rounded-lg border px-3 text-sm outline-none transition-all",
          "border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400",
          "focus-visible:border-neutral-500 data-[state=open]:border-neutral-500 data-[state=open]:ring-4 data-[state=open]:ring-neutral-200",
        )}
      >
        <span className="text-content-emphasis flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left">
          Sort by{" "}
          <strong className="font-semibold">{selectedSort.label}</strong>
        </span>
        <ChevronDown className="size-4 flex-shrink-0 text-neutral-400 transition-transform duration-75 group-data-[state=open]:rotate-180" />
      </button>
    </Popover>
  );
}
