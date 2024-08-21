"use client";

import { Button, Popover } from "@dub/ui";
import { Menu3 } from "@dub/ui/src/icons";
import { cn } from "@dub/utils";
import { ChevronDown } from "lucide-react";
import { useSelectedLayoutSegment } from "next/navigation";
import { PropsWithChildren, useState } from "react";
import { SettingsLayoutProps } from "./settings-layout";

export function SettingsNavMobile({
  tabs,
  children,
}: PropsWithChildren<Pick<SettingsLayoutProps, "tabs">>) {
  const [openPopover, setOpenPopover] = useState(false);

  const selectedLayoutSegment = useSelectedLayoutSegment();
  // Find selected tab nested in the tabs array
  const selectedTab = tabs
    .flatMap((group) => group.tabs)
    .find((tab) => tab.segment === selectedLayoutSegment);

  const Icon = selectedTab?.icon ?? Menu3;
  const label = selectedTab?.name ?? "Menu";

  return (
    <Popover
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
      align="start"
      content={
        <div
          className="flex w-full flex-col gap-4 px-5 sm:min-w-[200px] sm:px-4 sm:py-3"
          onClick={(e) => {
            if (e.target instanceof HTMLElement && e.target.tagName === "A")
              setOpenPopover(false);
          }}
        >
          {children}
        </div>
      }
    >
      <Button
        variant="secondary"
        className="w-full hover:bg-white sm:w-auto sm:min-w-[200px] [&>div]:w-full"
        text={
          <div className="flex w-full items-center gap-2">
            <div className="relative shrink-0">
              <Icon className="h-4 w-4" />
            </div>
            <span className="grow text-left">{label}</span>
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
