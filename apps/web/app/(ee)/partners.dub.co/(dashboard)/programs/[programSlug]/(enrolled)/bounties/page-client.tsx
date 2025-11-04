"use client";

import usePartnerProgramBounties from "@/lib/swr/use-partner-program-bounties";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { Heart, Trophy } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { useMemo, useState } from "react";
import {
  PartnerBountyCard,
  PartnerBountyCardSkeleton,
} from "./partner-bounty-card";

const tabs = [
  {
    label: "Active",
    id: "active",
  },
  {
    label: "Expired",
    id: "expired",
  },
] as const;

export function BountiesPageClient() {
  const [activeTab, setActiveTab] = useState<"active" | "expired">("active");
  const { bounties, bountiesCount, isLoading } = usePartnerProgramBounties();

  // Filter bounties based on active tab
  const filteredBounties = useMemo(() => {
    if (!bounties) return [];

    const now = new Date();
    return bounties.filter((bounty) => {
      const isExpired = bounty.endsAt && new Date(bounty.endsAt) <= now;

      if (activeTab === "active") {
        return !isExpired;
      } else {
        return isExpired;
      }
    });
  }, [bounties, activeTab]);

  return (
    <PageWidthWrapper className="pb-10">
      <div className="mb-6 grid grid-cols-2 gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              className={cn(
                "border-border-subtle flex flex-col gap-1 rounded-lg border p-4 text-left transition-colors duration-100",
                isActive
                  ? "border-black ring-1 ring-black"
                  : "hover:bg-bg-muted",
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="text-content-default text-xs font-semibold">
                {tab.label}
              </span>
              {bounties ? (
                <span className="text-content-emphasis text-base font-semibold">
                  {bountiesCount[tab.id].toLocaleString()}
                </span>
              ) : (
                <div className="h-6 w-12 animate-pulse rounded-md bg-neutral-200" />
              )}
            </button>
          );
        })}
      </div>

      {filteredBounties?.length !== 0 || isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredBounties?.length
            ? filteredBounties?.map((bounty) => (
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
                href="https://dub.co/help/article/program-bounties"
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
