"use client";

import {
  getPartnerBountyTab,
  PARTNER_BOUNTY_TABS,
  PartnerBountyTab,
} from "@/lib/bounty/partner-bounty-tabs";
import { usePartnerProgramBounties } from "@/lib/swr/use-partner-program-bounties";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { PartnerBountiesTable } from "@/ui/partners/bounties/partner-bounties-table";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { formatTabBadgeCount, SheetTabs } from "@/ui/shared/sheet-tabs";
import { ToggleGroup, useLocalStorage, useRouterStuff } from "@dub/ui";
import { GridIcon, Heart, TableRows2, Trophy } from "@dub/ui/icons";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { PartnerBountyCard, PartnerBountyCardSkeleton } from "./bounty-card";

const TAB_LABELS: Record<PartnerBountyTab, string> = {
  active: "Active",
  completed: "Completed",
  expired: "Expired",
};

const EMPTY_STATES: Record<
  Exclude<PartnerBountyTab, "active">,
  { title: string; description: string }
> = {
  completed: {
    title: "No completed bounties",
    description: "Bounties you complete appear here.",
  },
  expired: {
    title: "No expired bounties",
    description: "Bounties that ended before you completed them appear here.",
  },
};

type BountiesView = "grid" | "list";

export default function PartnerProgramBountiesPage() {
  const { programSlug } = useParams();
  const { searchParams, queryParams } = useRouterStuff();
  const { bounties, bountiesCount, isLoading } = usePartnerProgramBounties();

  const [view, setView] = useLocalStorage<BountiesView>(
    "partner-bounties-view",
    "grid",
  );

  const tab =
    PARTNER_BOUNTY_TABS.find((id) => id === searchParams.get("tab")) ??
    "active";

  const tabBounties = useMemo(
    () => bounties?.filter((bounty) => getPartnerBountyTab(bounty) === tab),
    [bounties, tab],
  );

  const getHref = (bounty: { id: string }) =>
    `/programs/${programSlug}/bounties/${bounty.id}`;

  return (
    <PageContent title="Bounties">
      <PageWidthWrapper className="pb-10">
        <div className="border-border-subtle overflow-clip rounded-xl border bg-neutral-100">
          <SheetTabs
            tabs={PARTNER_BOUNTY_TABS.map((id) => ({
              id,
              label: TAB_LABELS[id],
              // no count for Expired, as in the design
              badge:
                id === "expired"
                  ? undefined
                  : formatTabBadgeCount(bountiesCount[id]),
              badgeClassName: id === "completed" ? "bg-green-600" : undefined,
            }))}
            currentTabId={tab}
            setCurrentTabId={(id) =>
              queryParams({ set: { tab: id }, del: ["page"] })
            }
            right={
              <ToggleGroup
                className="bg-bg-muted shrink-0 gap-0 rounded-lg p-0"
                optionClassName="h-7 rounded-md px-1.5 py-0"
                indicatorClassName="bg-bg-default -left-px -top-px h-[calc(100%+2px)] w-[calc(100%+2px)]"
                options={[
                  {
                    value: "grid",
                    label: <GridIcon className="size-4" />,
                  },
                  {
                    value: "list",
                    label: <TableRows2 className="size-4" />,
                  },
                ]}
                selected={view}
                selectAction={(option) => setView(option as BountiesView)}
              />
            }
          />
          <div className="border-border-subtle -mx-px -mb-px overflow-clip rounded-xl border bg-white">
            {tabBounties?.length === 0 ? (
              <BountiesEmptyState tab={tab} />
            ) : view === "list" ? (
              <PartnerBountiesTable
                key={tab}
                bounties={tabBounties}
                isLoading={isLoading}
                getHref={getHref}
                resourceName={(plural) =>
                  `${tab} ${plural ? "bounties" : "bounty"}`
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-5 p-4 md:grid-cols-2 xl:grid-cols-3">
                {tabBounties
                  ? tabBounties.map((bounty) => (
                      <PartnerBountyCard
                        key={bounty.id}
                        bounty={bounty}
                        href={getHref(bounty)}
                      />
                    ))
                  : Array.from({ length: 3 }, (_, index) => (
                      <PartnerBountyCardSkeleton key={index} />
                    ))}
              </div>
            )}
          </div>
        </div>
      </PageWidthWrapper>
    </PageContent>
  );
}

function BountiesEmptyState({ tab }: { tab: PartnerBountyTab }) {
  return (
    <div className="py-10">
      <AnimatedEmptyState
        title={
          tab === "active" ? "No bounties to collect" : EMPTY_STATES[tab].title
        }
        description={
          tab === "active" ? (
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
          ) : (
            EMPTY_STATES[tab].description
          )
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
    </div>
  );
}
