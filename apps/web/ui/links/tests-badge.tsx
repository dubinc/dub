"use client";

import { Flask } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import * as HoverCard from "@radix-ui/react-hover-card";
import { useLinkCardContext } from "./link-card";
import { ResponseLink } from "./links-container";

export function TestsBadge({
  link,
}: {
  link: Pick<ResponseLink, "testVariants" | "testCompletedAt">;
}) {
  const { showTests, setShowTests } = useLinkCardContext();

  return (
    <div className="hidden sm:block">
      <HoverCard.Root openDelay={100}>
        <HoverCard.Portal>
          <HoverCard.Content
            side="bottom"
            sideOffset={8}
            className="animate-slide-up-fade z-[99] items-center overflow-hidden rounded-xl border border-neutral-200 bg-white p-2 text-sm text-neutral-700 shadow-sm"
          >
            A/B tests
          </HoverCard.Content>
        </HoverCard.Portal>
        <HoverCard.Trigger>
          <button
            type="button"
            className={cn(
              "rounded-md p-1.5 text-neutral-800 transition-colors duration-100 hover:bg-blue-50 hover:text-blue-500 active:bg-blue-100",
              showTests ? "text-blue-500" : "text-neutral-800",
            )}
            aria-pressed={showTests}
            onClick={() => setShowTests((s) => !s)}
          >
            <Flask className="size-3.5" />
          </button>
        </HoverCard.Trigger>
      </HoverCard.Root>
    </div>
  );
}
