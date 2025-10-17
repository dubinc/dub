"use client";

import { Flask } from "@dub/ui/icons";
import { cn, formatDateTime } from "@dub/utils";
import * as HoverCard from "@radix-ui/react-hover-card";
import { useLinkCardContext } from "./link-card";
import { ResponseLink } from "./links-container";

export function TestsBadge({
  link,
}: {
  link: Pick<ResponseLink, "testVariants" | "testCompletedAt">;
}) {
  const { showTests, setShowTests } = useLinkCardContext();

  const completedAtDate = link.testCompletedAt
    ? new Date(link.testCompletedAt)
    : null;
  const formattedDate = completedAtDate
    ? formatDateTime(completedAtDate, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : undefined;

  return (
    <div className="hidden sm:block">
      <HoverCard.Root openDelay={100}>
        <HoverCard.Portal>
          <HoverCard.Content
            side="bottom"
            sideOffset={8}
            className="animate-slide-up-fade z-[99] overflow-hidden rounded-xl border border-neutral-200 bg-white p-3 text-sm text-neutral-700 shadow-sm"
          >
            {formattedDate ? (
              <div className="text-center">
                <p className="font-semibold text-neutral-900">
                  A/B test is running
                </p>
                <p className="mt-1 text-neutral-600">
                  Scheduled completion date is{" "}
                  <span className="font-medium text-neutral-800">
                    {formattedDate}
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-center">A/B tests</p>
            )}
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
