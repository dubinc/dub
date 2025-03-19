"use client";

import { Flask } from "@dub/ui/icons";
import * as HoverCard from "@radix-ui/react-hover-card";
import { ResponseLink } from "./links-container";

export function TestsBadge({
  link,
}: {
  link: Pick<ResponseLink, "tests" | "testsCompleteAt">;
}) {
  return (
    <div className="hidden sm:block">
      <HoverCard.Root openDelay={100}>
        <HoverCard.Portal>
          <HoverCard.Content
            side="bottom"
            sideOffset={8}
            className="animate-slide-up-fade z-[99] items-center overflow-hidden rounded-xl border border-neutral-200 bg-white p-2 text-sm text-neutral-700 shadow-sm"
          >
            A/B testing enabled
          </HoverCard.Content>
        </HoverCard.Portal>
        <HoverCard.Trigger asChild>
          <div className="rounded-md p-1.5 hover:bg-blue-50">
            <Flask className="size-3.5 text-blue-500" />
          </div>
        </HoverCard.Trigger>
      </HoverCard.Root>
    </div>
  );
}
