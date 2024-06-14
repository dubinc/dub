import { AnimatedSizeContainer, Popover, useMediaQuery } from "@dub/ui";
import { Button } from "@dub/ui/src/button";
import { ReferredVia } from "@dub/ui/src/icons";
import { cn } from "@dub/utils";
import { useContext, useEffect, useState } from "react";
import { ThreeDots } from "../shared/icons";
import { AnalyticsContext } from "./analytics-provider";
import ExportButton from "./export-button";
import ShareAnalytics from "./share-analytics";

export default function AnalyticsOptions() {
  const { isMobile } = useMediaQuery();
  const { key } = useContext(AnalyticsContext);
  const [openPopover, setOpenPopover] = useState(false);

  const [state, setState] = useState<"default" | "share">("default");
  useEffect(() => {
    if (!openPopover || !key) {
      setState("default");
    }
  }, [openPopover, key]);

  return (
    <Popover
      align="end"
      content={
        <AnimatedSizeContainer width={!isMobile} height>
          {state === "share" && <ShareAnalytics />}

          {state === "default" && (
            <div className="grid w-screen gap-px p-2 sm:w-48">
              <ExportButton setOpenPopover={setOpenPopover} />
              {key && (
                <Button
                  text="Share Analytics"
                  variant="outline"
                  icon={<ReferredVia className="h-4 w-4" />}
                  className="h-9 justify-start px-2 text-black"
                  onClick={() => setState("share")}
                />
              )}
            </div>
          )}
        </AnimatedSizeContainer>
      }
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
    >
      <button
        onClick={() => setOpenPopover(!openPopover)}
        className={cn(
          "flex h-10 items-center rounded-md border px-1.5 outline-none transition-all",
          "border-gray-200 bg-white text-gray-900 placeholder-gray-400",
          "focus-visible:border-gray-500 data-[state=open]:border-gray-500 data-[state=open]:ring-4 data-[state=open]:ring-gray-200",
        )}
      >
        <ThreeDots className="h-5 w-5 text-gray-500" />
      </button>
    </Popover>
  );
}
