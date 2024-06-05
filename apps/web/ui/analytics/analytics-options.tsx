import { AnimatedSizeContainer, Popover, useMediaQuery } from "@dub/ui";
import { Button } from "@dub/ui/src/button";
import { ReferredVia } from "@dub/ui/src/icons";
import { useContext, useState } from "react";
import { AnalyticsContext } from ".";
import { ThreeDots } from "../shared/icons";
import ExportButton from "./export-button";
import ShareAnalytics from "./share-analytics";

export default function AnalyticsOptions() {
  const { isMobile } = useMediaQuery();
  const { key } = useContext(AnalyticsContext);

  const [openPopover, setOpenPopover] = useState(false);

  const [state, setState] = useState<"default" | "share">("default");

  return (
    <Popover
      align="end"
      content={
        <AnimatedSizeContainer width={!isMobile} height>
          {key && state === "share" && <ShareAnalytics />}

          {state === "default" && (
            <div className="grid gap-px p-2 sm:w-44">
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
      <div>
        <Button
          variant="secondary"
          onClick={() => setOpenPopover(!openPopover)}
          icon={<ThreeDots className="h-5 w-5 text-gray-500" />}
          className="h-10 space-x-0 px-1 py-2"
        />
      </div>
    </Popover>
  );
}
