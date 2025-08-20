"use client";

import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { Heart, Trophy } from "@dub/ui/icons";

export function BountiesPageClient() {
  return (
    <PageWidthWrapper className="pb-10">
      <AnimatedEmptyState
        title="No bounties to collect"
        description={
          <>
            This program isn't offering any bounties at the moment.{" "}
            <a
              href="https://dub.co/help/article/bounties"
              target="_blank"
              className="hover:text-content-default underline sm:whitespace-nowrap"
            >
              Learn more about bounties
            </a>
            .
          </>
        }
        cardContent={(idx) => {
          const Icon = [Trophy, Heart][idx % 2];
          return (
            <>
              <Icon className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
            </>
          );
        }}
      />
    </PageWidthWrapper>
  );
}
