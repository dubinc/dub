"use client";

import usePartnerProgramBounties from "@/lib/swr/use-partner-program-bounties";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { Heart, Trophy } from "@dub/ui/icons";
import {
  PartnerBountyCard,
  PartnerBountyCardSkeleton,
} from "./partner-bounty-card";

export function BountiesPageClient() {
  const { bounties, isLoading } = usePartnerProgramBounties();

  return (
    <PageWidthWrapper className="pb-10">
      {bounties?.length !== 0 || isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {bounties?.length
            ? bounties?.map((bounty) => (
                <PartnerBountyCard key={bounty.id} bounty={bounty} />
              ))
            : Array.from({ length: 3 }, (_, index) => (
                <PartnerBountyCardSkeleton key={index} />
              ))}
        </div>
      ) : (
        <AnimatedEmptyState
          title="No bounties to collect"
          description={
            <>
              This program isn't offering any bounties at the moment.{" "}
              <a
                href="https://dub.co/help/article/bounties"
                target="_blank"
                rel="noopener noreferrer"
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
      )}
    </PageWidthWrapper>
  );
}
