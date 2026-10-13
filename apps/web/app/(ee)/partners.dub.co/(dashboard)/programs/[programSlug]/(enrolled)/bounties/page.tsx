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
import { PARTNER_BOUNTY_TAB_CONFIG } from "./bounty-tabs";

type BountiesView = "grid" | "table";

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
            tabs={PARTNER_BOUNTY_TABS.map((id) => {
              const config = PARTNER_BOUNTY_TAB_CONFIG[id];

              return {
                id,
                label: config.label,
                badge: config.showCount
                  ? formatTabBadgeCount(bountiesCount[id])
                  : undefined,
                badgeClassName: config.badgeClassName,
              };
            })}
            currentTabId={tab}
            setCurrentTabId={(id) => queryParams({ set: { tab: id } })}
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
                    value: "table",
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
            ) : view === "table" ? (
              <PartnerBountiesTable
                key={tab}
                bounties={tabBounties}
                isLoading={isLoading}
                getHref={getHref}
                resourceName={(plural) =>
                  PARTNER_BOUNTY_TAB_CONFIG[tab].resourceName[
                    plural ? "plural" : "singular"
                  ]
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
  const { title, description, showLearnMore } =
    PARTNER_BOUNTY_TAB_CONFIG[tab].emptyState;

  return (
    <div className="py-10">
      <AnimatedEmptyState
        title={title}
        description={
          showLearnMore ? (
            <>
              {description}{" "}
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
            description
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
