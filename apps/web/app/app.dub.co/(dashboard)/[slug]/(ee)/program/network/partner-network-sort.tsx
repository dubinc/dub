import { IconMenu, Popover, Tick, useRouterStuff } from "@dub/ui";
import { ChartActivity2, Megaphone } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { PlatformType } from "@prisma/client";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function getPlatformSortLabel(platform: PlatformType) {
  switch (platform) {
    case "website":
      return "Domain Ranking";
    case "youtube":
      return "Subscribers";
    default:
      return "Followers";
  }
}

export function PartnerNetworkSort({
  selectedPlatform,
  className,
}: {
  selectedPlatform: PlatformType | "all";
  className?: string;
}) {
  const { queryParams, searchParams } = useRouterStuff();
  const [openPopover, setOpenPopover] = useState(false);

  const sortBy = searchParams.get("sortBy") || "relevance";

  useEffect(() => {
    if (selectedPlatform === "all" && sortBy === "subscribers") {
      queryParams({ del: ["sortBy"] });
    }
  }, [selectedPlatform, sortBy, queryParams]);

  const sortOptions = useMemo(() => {
    const options = [
      {
        value: "relevance",
        label: "Relevance",
        icon: ChartActivity2,
      },
    ];

    if (selectedPlatform !== "all") {
      options.push({
        value: "subscribers",
        label: getPlatformSortLabel(selectedPlatform),
        icon: Megaphone,
      });
    }

    return options;
  }, [selectedPlatform]);

  const selectedSort =
    sortOptions.find((option) => option.value === sortBy) ?? sortOptions[0];

  return (
    <Popover
      content={
        <div className="w-full p-2 md:w-52">
          {sortOptions.map(({ label, value, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                queryParams({
                  set: value === "relevance" ? undefined : { sortBy: value },
                  del: ["page", ...(value === "relevance" ? ["sortBy"] : [])],
                });
                setOpenPopover(false);
              }}
              className="flex w-full items-center justify-between space-x-2 rounded-md px-1 py-2 hover:bg-neutral-100 active:bg-neutral-200"
            >
              <IconMenu text={label} icon={<Icon className="size-4" />} />
              {value === selectedSort.value && (
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
        type="button"
        onClick={() => setOpenPopover(!openPopover)}
        className={cn(
          "group flex h-10 w-full cursor-pointer appearance-none items-center gap-x-2 truncate rounded-lg border px-3 text-sm outline-none transition-all md:w-auto",
          "border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400",
          "focus-visible:border-neutral-500 data-[state=open]:border-neutral-500 data-[state=open]:ring-4 data-[state=open]:ring-neutral-200",
          className,
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
