"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { MaxWidthWrapper } from "@dub/ui";
import { CursorRays } from "../layout/sidebar/icons/cursor-rays";
import { AnimatedEmptyState } from "../shared/animated-empty-state";

export default function WorkspaceExceededClicks() {
  const { slug, nextPlan } = useWorkspace();

  return (
    <MaxWidthWrapper>
      <div className="my-10 flex flex-col items-center justify-center rounded-md border border-neutral-200 bg-white py-12">
        <AnimatedEmptyState
          title="Stats Locked"
          description="Your workspace has exceeded your monthly clicks limits. We're still collecting data on your links, but you need to upgrade to view them."
          cardContent={() => (
            <>
              <CursorRays className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
            </>
          )}
          className="border-none"
          learnMoreText={
            nextPlan ? `Upgrade to ${nextPlan.name}` : "Contact support"
          }
          learnMoreHref={
            nextPlan ? `/${slug}/upgrade?exit=close` : "https://dub.co/contact"
          }
        />
      </div>
    </MaxWidthWrapper>
  );
}
