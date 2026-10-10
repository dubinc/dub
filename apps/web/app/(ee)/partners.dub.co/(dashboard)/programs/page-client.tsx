"use client";

import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import useProgramEnrollmentsCount from "@/lib/swr/use-program-enrollments-count";
import useProgramEnrollmentsStatusCounts from "@/lib/swr/use-program-enrollments-status-counts";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ProgramCard, ProgramCardSkeleton } from "@/ui/partners/program-card";
import { ProgramInviteCard } from "@/ui/partners/program-invite-card";
import { ProgramMarketplaceBanner } from "@/ui/program-marketplace/program-marketplace-banner";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import { formatTabBadgeCount, SheetTabs } from "@/ui/shared/sheet-tabs";
import { SimpleEmptyState } from "@/ui/shared/simple-empty-state";
import { ToggleGroup, useLocalStorage, useRouterStuff } from "@dub/ui";
import { GridIcon, HexadecagonStar, TableRows2 } from "@dub/ui/icons";
import { useId } from "react";
import {
  PROGRAM_TABS,
  PROGRAMS_TABLE_VIEW_THRESHOLD,
  ProgramTab,
} from "./program-tabs";
import { ProgramsTable } from "./programs-table";

type ProgramsView = "grid" | "table";

export function PartnersDashboardPageClient() {
  const { searchParams, queryParams } = useRouterStuff();

  // null until the partner chooses a view with the toggle
  const [savedView, setView] = useLocalStorage<ProgramsView | null>(
    "partner-programs-view",
    null,
  );

  const search = searchParams.get("search") || undefined;

  const { counts: statusCounts, error: statusCountsError } =
    useProgramEnrollmentsStatusCounts();

  const getTabCount = (programTab: ProgramTab) =>
    statusCounts
      ? programTab.statuses.reduce(
          (sum, status) => sum + (statusCounts[status] ?? 0),
          0,
        )
      : undefined;

  // without a tab in the URL, open the first tab that has programs, so that
  // partners with only applications or invitations do not see an empty tab.
  // If the counts fail to load, open the Active tab.
  const tab =
    PROGRAM_TABS.find(({ id }) => id === searchParams.get("tab")) ??
    (statusCounts
      ? PROGRAM_TABS.find((programTab) => getTabCount(programTab)) ??
        PROGRAM_TABS[0]
      : statusCountsError
        ? PROGRAM_TABS[0]
        : undefined);

  const view: ProgramsView | undefined =
    savedView ??
    (statusCounts
      ? statusCounts.approved > PROGRAMS_TABLE_VIEW_THRESHOLD
        ? "table"
        : "grid"
      : statusCountsError
        ? "grid"
        : undefined);

  // the Inactive tab shows only when the partner has an inactive program
  const tabs = PROGRAM_TABS.filter(
    (programTab) =>
      programTab.id !== "inactive" ||
      getTabCount(programTab) ||
      tab?.id === "inactive",
  );

  return (
    <PageWidthWrapper className="flex flex-col gap-4 pb-10">
      <ProgramMarketplaceBanner />

      <div className="flex items-center justify-between gap-3">
        <SearchBoxPersisted
          placeholder="Search programs"
          inputClassName="md:w-[16rem]"
        />
        <ToggleGroup
          className="bg-bg-muted h-10 shrink-0 gap-0 rounded-lg p-0"
          optionClassName="h-full rounded-md px-2.5 py-0"
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
          selected={view ?? ""}
          selectAction={(option) => setView(option as ProgramsView)}
        />
      </div>

      <div className="border-border-subtle overflow-clip rounded-xl border bg-neutral-100">
        <SheetTabs
          tabs={tabs.map(({ id, label, icon }) => ({
            id,
            label,
            icon,
            badge:
              id === "invitations"
                ? formatTabBadgeCount(statusCounts?.invited)
                : undefined,
          }))}
          currentTabId={tab?.id ?? ""}
          setCurrentTabId={(id) =>
            queryParams({
              set: { tab: id },
              del: ["page"],
            })
          }
        />
        <div className="border-border-subtle -mx-px -mb-px overflow-clip rounded-xl border bg-white">
          {tab && view ? (
            <ProgramsTabContent
              tab={tab}
              search={search}
              view={view}
              tabCount={getTabCount(tab)}
              statusCountsFailed={!!statusCountsError}
            />
          ) : (
            <ProgramsGridSkeleton />
          )}
        </div>
      </div>
    </PageWidthWrapper>
  );
}

function ProgramsTabContent({
  tab,
  search,
  view,
  tabCount,
  statusCountsFailed,
}: {
  tab: ProgramTab;
  search?: string;
  view: ProgramsView;
  tabCount?: number;
  statusCountsFailed: boolean;
}) {
  // without a search, the status counts already give the count of the tab
  const needsCountRequest = !!search || statusCountsFailed;

  const { count: requestedCount, error: countError } =
    useProgramEnrollmentsCount(
      { status: tab.statuses.join(","), search },
      { enabled: needsCountRequest },
    );

  const count = needsCountRequest ? requestedCount : tabCount;

  if (count === 0) {
    return <ProgramsEmptyState tab={tab} search={search} />;
  }

  return view === "table" ? (
    <ProgramsTable
      tab={tab}
      search={search}
      count={count}
      countError={countError}
    />
  ) : (
    <ProgramsGrid tab={tab} search={search} />
  );
}

function ProgramsGridSkeleton() {
  return (
    <div className="@md/page:grid-cols-2 @3xl/page:grid-cols-3 grid gap-4 p-4">
      {Array.from({ length: 3 }).map((_, idx) => (
        <ProgramCardSkeleton key={idx} />
      ))}
    </div>
  );
}

function ProgramsGrid({ tab, search }: { tab: ProgramTab; search?: string }) {
  const { programEnrollments, isLoading, error } = useProgramEnrollments({
    // only the invite cards show the rewards and the discount
    includeRewardsDiscounts: tab.id === "invitations",
    status: tab.statuses.join(","),
    search,
  });

  if (error) {
    return (
      <div className="py-10 text-center text-sm text-neutral-500">
        Failed to load programs
      </div>
    );
  }

  return (
    <div className="@md/page:grid-cols-2 @3xl/page:grid-cols-3 grid gap-4 p-4">
      {isLoading || !programEnrollments
        ? Array.from({ length: 3 }).map((_, idx) => (
            <ProgramCardSkeleton key={idx} />
          ))
        : programEnrollments.map((programEnrollment) =>
            tab.id === "invitations" ? (
              <ProgramInviteCard
                key={programEnrollment.programId}
                programEnrollment={programEnrollment}
              />
            ) : (
              <ProgramCard
                key={programEnrollment.programId}
                programEnrollment={programEnrollment}
              />
            ),
          )}
    </div>
  );
}

function ProgramsEmptyState({
  tab,
  search,
}: {
  tab: ProgramTab;
  search?: string;
}) {
  return (
    <div className="py-10">
      <SimpleEmptyState
        title={search ? "No programs found" : tab.emptyState.title}
        description={
          search
            ? `No ${tab.resourceName}s match "${search}". Try a different search.`
            : tab.emptyState.description
        }
        graphic={
          <div className="border-border-subtle flex flex-col gap-4 rounded-xl border p-3 shadow-[0_4px_12px_#0001]">
            <HexadecagonStar className="text-content-default size-6" />
            <div className="flex flex-col gap-2">
              <div className="bg-bg-emphasis h-2.5 w-8 rounded" />
              <div className="bg-bg-emphasis h-2.5 w-16 rounded" />
            </div>
            <div className="bg-bg-subtle border-subtle grid w-40 max-w-full grid-cols-2 items-center gap-5 rounded-lg border p-2">
              <div className="flex flex-col gap-2">
                <div className="bg-bg-emphasis h-2.5 w-9 rounded" />
                <div className="bg-bg-inverted h-2.5 w-12 rounded" />
              </div>
              <EmptyStateChart />
            </div>
          </div>
        }
      />
    </div>
  );
}

function EmptyStateChart() {
  const id = useId();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 61 28"
      className="h-auto w-full"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#262626" />
          <stop stopColor="#262626" stopOpacity="0" offset="1" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${id})`}
        d="m51.893 5.274-4.954 6.63a4 4 0 0 1-4.88 1.238l-3.053-1.408a4 4 0 0 0-3.062-.121l-5.094 1.88a4 4 0 0 1-1.753.231l-5.836-.538a4 4 0 0 1-1.443-.417l-4.338-2.202a4 4 0 0 0-4.524.627l-4.873 4.499a4 4 0 0 1-1.327.813L0 19v9h60V1l-6.579 3.036a4 4 0 0 0-1.528 1.238"
        opacity="0.25"
      />
      <path
        stroke="#262626"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="m.5 19.274 6.668-3.125a6 6 0 0 0 1.375-.892l3.738-3.228a6 6 0 0 1 6.646-.805l2.76 1.406a6 6 0 0 0 2.253.636l5.066.399a6 6 0 0 0 2.271-.258l4.283-1.348a6 6 0 0 1 3.997.14l1.252.492a6 6 0 0 0 6.944-1.916l3.779-4.891a6 6 0 0 1 2.195-1.762l6.106-2.872"
      />
    </svg>
  );
}
