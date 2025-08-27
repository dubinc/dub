"use client";

import { NavButton } from "@/ui/layout/page-content/nav-button";
import { ToggleSidePanelButton } from "@/ui/messages/toggle-side-panel-button";
import { Button } from "@dub/ui";
import { ChevronLeft, Msgs } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { CSSProperties, useState } from "react";
import { toast } from "sonner";

export function ProgramMessagesPageClient() {
  const [currentPanel, setCurrentPanel] = useState<0 | 1 | 2>(0);

  const isRightPanelOpen = currentPanel === 2;

  return (
    <div className="@container/page h-[calc(100vh-0.5rem-1px)] w-full overflow-hidden rounded-t-[inherit] bg-white">
      <div
        className="@[960px]/page:grid-cols-[min-content_minmax(340px,1fr)_minmax(0,min-content)] @[960px]/page:translate-x-0 grid h-full translate-x-[calc(var(--current-panel)*-100%)] grid-cols-[100%_100%_100%]"
        style={
          {
            "--current-panel": currentPanel,
          } as CSSProperties
        }
      >
        {/* Left panel - Partner/messages list */}
        <div className="@[960px]/page:w-[280px] @[1080px]/page:w-[340px] flex w-full flex-col overflow-hidden">
          <div className="border-border-subtle flex h-12 items-center justify-between gap-4 border-b px-4 sm:h-16 sm:px-6">
            <div className="flex min-w-0 items-center gap-4">
              <NavButton />
              <div className="flex items-center gap-2">
                <h1 className="text-content-emphasis text-lg font-semibold leading-7">
                  Messages
                </h1>
              </div>
            </div>
          </div>
          <div className="grow">
            <div className="flex size-full flex-col items-center justify-center px-4">
              {/* TODO: Remove onClick (it's there for testing) */}
              <Msgs
                className="size-10 text-black"
                onClick={() => setCurrentPanel(1)}
              />
              <div className="mt-6 max-w-64 text-center">
                <span className="text-content-emphasis text-base font-semibold">
                  You don't have any messages
                </span>
                <p className="text-content-subtle text-sm font-medium">
                  When you receive a new message, it will appear here. You can
                  also start a conversation at any time.
                </p>
              </div>

              <Button
                variant="primary"
                className="mt-6 h-8 w-fit rounded-lg"
                text="Compose message"
                onClick={() => toast.info("WIP")}
              />
            </div>
          </div>
        </div>

        {/* Middle panel - Messages */}
        <div className="border-border-subtle @[960px]/page:border-l size-full">
          <div className="border-border-subtle flex h-12 items-center justify-between gap-4 border-b px-4 sm:h-16 sm:px-6">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPanel(0)}
                className="@[960px]/page:hidden rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <h2 className="text-content-emphasis text-lg font-semibold leading-7">
                [Partner Name]
              </h2>
            </div>
            <ToggleSidePanelButton
              isOpen={currentPanel === 2}
              onClick={() => {
                setCurrentPanel((p) => (p === 2 ? 1 : 2));
              }}
            />
          </div>
          <div>[messages content]</div>
        </div>

        {/* Right panel - Profile */}
        <div
          className={cn(
            "@[960px]/page:w-0 w-full overflow-hidden transition-[width]",
            isRightPanelOpen && "@[960px]/page:w-[340px]",
          )}
        >
          <div className="border-border-subtle @[960px]/page:border-l @[960px]/page:w-[340px] size-full w-full">
            <div className="border-border-subtle flex h-12 items-center justify-between gap-4 border-b px-4 sm:h-16 sm:px-6">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPanel(1)}
                  className="@[960px]/page:hidden rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <h2 className="text-content-emphasis text-lg font-semibold leading-7">
                  Profile
                </h2>
              </div>
            </div>
            <div>[profile panel content]</div>
          </div>
        </div>
      </div>
    </div>
  );
}
