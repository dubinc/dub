"use client";

import { BountyWithSubmissionsProps } from "@/lib/types";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { Heart, Trophy } from "@dub/ui/icons";
import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { BountyCard, BountyCardSkeleton } from "./bounty-card";

export function BountiesPageClient() {
  const { programSlug } = useParams();

  const {
    data: bounties,
    isLoading,
    error,
  } = useSWR<BountyWithSubmissionsProps[]>(
    `/api/partner-profile/programs/${programSlug}/bounties`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return (
    <PageWidthWrapper className="pb-10">
      {bounties?.length !== 0 || isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {isLoading
            ? Array.from({ length: 3 }, (_, index) => (
                <BountyCardSkeleton key={index} />
              ))
            : bounties?.map((bounty) => (
                <BountyCard key={bounty.id} bounty={bounty} />
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
