import { Button, Popover, Switch, useRouterStuff } from "@dub/ui";
import {
  ArrowsOppositeDirectionY,
  BoxArchive,
  GridLayoutRows,
  Sliders,
  TableRows2,
} from "@dub/ui/src/icons";
import { cn } from "@dub/utils";
import { ChevronDown } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import LinkSort from "./link-sort";
import { LinksViewMode } from "./links-container";

export default function LinkDisplay({
  viewMode,
  onViewModeChange,
}: {
  viewMode: LinksViewMode;
  onViewModeChange: (viewMode: LinksViewMode) => void;
}) {
  const [openPopover, setOpenPopover] = useState(false);
  const searchParams = useSearchParams();
  const sort = searchParams?.get("sort");
  const { queryParams } = useRouterStuff();

  return (
    <Popover
      content={
        <div className="w-full divide-y divide-gray-200 text-sm md:w-80">
          <div className="grid grid-cols-2 gap-2 p-3">
            {[
              { id: "cards", label: "Cards", icon: GridLayoutRows },
              { id: "rows", label: "Rows", icon: TableRows2 },
            ].map(({ id, label, icon: Icon }) => {
              const selected = viewMode === id;
              return (
                <button
                  key={id}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 rounded-md transition-colors",
                    selected
                      ? "bg-gray-200 text-gray-950"
                      : "text-gray-800 hover:bg-gray-100 hover:text-gray-950",
                  )}
                  onClick={() => onViewModeChange(id as LinksViewMode)}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 text-gray-600",
                      selected && "text-gray-800",
                    )}
                  />
                  {label}
                </button>
              );
            })}
          </div>
          <div className="flex h-20 items-center justify-between gap-2 px-4">
            <span className="flex items-center gap-2">
              <ArrowsOppositeDirectionY className="h-4 w-4 text-gray-800" />
              Ordering
            </span>
            <div>
              <LinkSort />
            </div>
          </div>
          <div className="flex h-20 items-center justify-between gap-2 px-4">
            <span className="flex items-center gap-2">
              <BoxArchive className="h-4 w-4 text-gray-800" />
              Show archived links
            </span>
            <div>
              <Switch
                checked={searchParams.get("showArchived") === "true"}
                fn={(checked) =>
                  queryParams(
                    checked
                      ? {
                          set: {
                            showArchived: "true",
                          },
                        }
                      : { del: "showArchived" },
                  )
                }
              />
            </div>
          </div>
        </div>
      }
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
    >
      <Button
        variant="secondary"
        className="[&>div]:w-full"
        text={
          <div className="flex w-full items-center gap-2">
            <Sliders className="h-4 w-4" />
            <span className="grow text-left">Display</span>
            <ChevronDown
              className={cn("h-4 w-4 text-gray-400 transition-transform", {
                "rotate-180": openPopover,
              })}
            />
          </div>
        }
      />
    </Popover>
  );
}
