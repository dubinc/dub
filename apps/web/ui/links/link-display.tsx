import { Button, Popover, useRouterStuff } from "@dub/ui";
import { Sliders } from "@dub/ui/src/icons";
import { cn } from "@dub/utils";
import { ChevronDown } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LinkDisplay() {
  const [openPopover, setOpenPopover] = useState(false);
  const searchParams = useSearchParams();
  const sort = searchParams?.get("sort");
  const { queryParams } = useRouterStuff();

  return (
    <Popover
      content={<div className="w-full p-2 md:w-48">options</div>}
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
