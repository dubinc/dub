"use client";

import { Markdown } from "@/ui/shared/markdown";
import { Page2 } from "@dub/ui/icons";
import * as HoverCard from "@radix-ui/react-hover-card";

export function CommentsBadge({ comments }: { comments: string }) {
  return (
    <div className="hidden sm:block">
      <HoverCard.Root openDelay={100}>
        <HoverCard.Portal>
          <HoverCard.Content
            side="bottom"
            sideOffset={8}
            className="animate-slide-up-fade z-[99] items-center overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
          >
            <div className="divide-y-gray-200 divide-y text-sm">
              <div className="flex items-center gap-2 px-4 py-3">
                <Page2 className="size-3.5" />
                <span className="text-gray-500">Link comments</span>
              </div>
              <Markdown className="max-w-[300px] whitespace-normal break-words px-5 py-3">
                {comments}
              </Markdown>
            </div>
          </HoverCard.Content>
        </HoverCard.Portal>
        <HoverCard.Trigger asChild>
          <div className="rounded-full p-1.5 hover:bg-gray-100">
            <Page2 className="size-3.5" />
          </div>
        </HoverCard.Trigger>
      </HoverCard.Root>
    </div>
  );
}
