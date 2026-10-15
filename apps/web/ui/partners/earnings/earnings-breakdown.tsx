"use client";

import { usePartnerProfileEarningsAnalytics } from "@/lib/swr/use-partner-profile-earnings";
import {
  PartnerProfileEarningsAnalyticsByGroup,
  PartnerProfileEarningsAnalyticsGroupBy,
  PartnerProfileEarningsAttributeGroupBy,
} from "@/lib/types";
import { AnalyticsCard } from "@/ui/analytics/analytics-card";
import {
  AnalyticsCardEmptyState,
  AnalyticsCardLoadingState,
} from "@/ui/analytics/analytics-card-states";
import { BarList } from "@/ui/analytics/bar-list";
import { ContinentIcon } from "@/ui/analytics/continent-icon";
import { ReferrerIcon } from "@/ui/analytics/referrer-icon";
import { CommissionTypeIcon } from "@/ui/partners/comission-type-icon";
import { ProgramLogo } from "@/ui/partners/program-logo";
import { CountryFlag } from "@/ui/shared/country-flag";
import { useRouterStuff, UTM_PARAMETERS } from "@dub/ui";
import {
  CircleDollar,
  FlagWavy,
  GridIcon,
  Hyperlink,
  MapPosition,
  MoneyBills2,
  Note,
} from "@dub/ui/icons";
import { capitalize, CONTINENTS, COUNTRIES } from "@dub/utils";
import { ReactNode, useCallback, useMemo, useState } from "react";
import { usePartnerEarningsFilters } from "./use-partner-earnings-filters";

// the most groups the earnings analytics route returns. "View all" lists all of them
const EARNINGS_BREAKDOWN_LIMIT = 100;

const EARNINGS_METRIC = { label: "Earnings", icon: CircleDollar };

type BreakdownRow = {
  icon: ReactNode;
  title: string;
  value: number;
  href?: string; // sets the page filter for this row
};

// the earnings of the All programs Earnings page, summed by program, link, type and location
export function EarningsBreakdown() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <ProgramsCard />
      <LinksCard />
      <TypeCard />
      <LocationCard />
    </div>
  );
}

function ProgramsCard() {
  const { rows, error, filterValue, clearFilter } =
    useEarningsBreakdown("programId");

  return (
    <AnalyticsCard
      tabs={[{ id: "programs", label: "Programs", icon: GridIcon }]}
      selectedTabId="programs"
      expandLimit={8}
      dataLength={rows?.length}
      isFilterActive={!!filterValue}
      onClearFilter={clearFilter}
      metric={EARNINGS_METRIC}
    >
      {({ limit, setShowModal }) => (
        <EarningsBarList
          tab="programs"
          rows={rows}
          error={error}
          limit={limit}
          setShowModal={setShowModal}
          barBackground="bg-orange-100"
          hoverBackground="hover:bg-gradient-to-r hover:from-orange-50 hover:to-transparent hover:border-orange-500"
        />
      )}
    </AnalyticsCard>
  );
}

const LINK_SUBTABS = [
  { id: "domain", label: "Domain" },
  { id: "linkId", label: "URL" },
] as const;

// the UTM fields of a link (UTM_PARAMETERS also has "ref")
const UTM_SUBTABS = UTM_PARAMETERS.filter(({ key }) =>
  key.startsWith("utm_"),
).map(({ key, label }) => ({
  id: key,
  label,
}));

function LinksCard() {
  const [tab, setTab] = useState<"links" | "utms">("links");
  const [subtab, setSubtab] = useState<string>("domain");

  const subtabs = tab === "links" ? LINK_SUBTABS : UTM_SUBTABS;

  const { rows, error, filterValue, clearFilter } = useEarningsBreakdown(
    subtab as PartnerProfileEarningsAnalyticsGroupBy,
  );

  return (
    <AnalyticsCard
      tabs={[
        { id: "links", label: "Links", icon: Hyperlink },
        { id: "utms", label: "UTM Parameters", icon: Note },
      ]}
      selectedTabId={tab}
      onSelectTab={(newTab) => {
        setTab(newTab);
        setSubtab(newTab === "links" ? "domain" : "utm_source");
      }}
      subTabs={[...subtabs]}
      selectedSubTabId={subtab}
      onSelectSubTab={setSubtab}
      expandLimit={8}
      dataLength={rows?.length}
      isFilterActive={!!filterValue}
      onClearFilter={clearFilter}
      metric={EARNINGS_METRIC}
    >
      {({ limit, setShowModal }) => (
        <EarningsBarList
          tab={tab === "links" ? "links" : "UTM parameters"}
          rows={rows}
          error={error}
          limit={limit}
          setShowModal={setShowModal}
          barBackground="bg-red-100"
          hoverBackground="hover:bg-gradient-to-r hover:from-red-50 hover:to-transparent hover:border-red-500"
        />
      )}
    </AnalyticsCard>
  );
}

function TypeCard() {
  const { rows, error, filterValue, clearFilter } =
    useEarningsBreakdown("type");

  return (
    <AnalyticsCard
      tabs={[{ id: "type", label: "Type", icon: MoneyBills2 }]}
      selectedTabId="type"
      expandLimit={8}
      dataLength={rows?.length}
      isFilterActive={!!filterValue}
      onClearFilter={clearFilter}
      metric={EARNINGS_METRIC}
    >
      {({ limit, setShowModal }) => (
        <EarningsBarList
          tab="types"
          rows={rows}
          error={error}
          limit={limit}
          setShowModal={setShowModal}
          barBackground="bg-green-100"
          hoverBackground="hover:bg-gradient-to-r hover:from-green-50 hover:to-transparent hover:border-green-500"
        />
      )}
    </AnalyticsCard>
  );
}

function LocationCard() {
  const [tab, setTab] = useState<"country" | "continent">("country");

  const { rows, error } = useEarningsBreakdown(tab);

  return (
    <AnalyticsCard
      tabs={[
        { id: "country", label: "Countries", icon: FlagWavy },
        { id: "continent", label: "Continents", icon: MapPosition },
      ]}
      selectedTabId={tab}
      onSelectTab={setTab}
      expandLimit={8}
      dataLength={rows?.length}
      metric={EARNINGS_METRIC}
    >
      {({ limit, setShowModal }) => (
        <EarningsBarList
          tab={tab === "country" ? "countries" : "continents"}
          rows={rows}
          error={error}
          limit={limit}
          setShowModal={setShowModal}
          barBackground="bg-blue-100"
          hoverBackground="hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent hover:border-blue-500"
        />
      )}
    </AnalyticsCard>
  );
}

function EarningsBarList({
  tab,
  rows,
  error,
  limit,
  setShowModal,
  barBackground,
  hoverBackground,
}: {
  tab: string;
  rows?: BreakdownRow[];
  error?: unknown;
  limit?: number;
  setShowModal: (show: boolean) => void;
  barBackground: string;
  hoverBackground: string;
}) {
  if (error || rows?.length === 0) {
    return (
      <AnalyticsCardEmptyState
        message={
          error ? "Failed to load earnings" : "No earnings in this date range"
        }
      />
    );
  }

  if (!rows) {
    return <AnalyticsCardLoadingState />;
  }

  return (
    <BarList
      tab={tab}
      unit="earnings"
      data={rows}
      maxValue={Math.max(...rows.map(({ value }) => value))}
      barBackground={barBackground}
      hoverBackground={hoverBackground}
      setShowModal={setShowModal}
      {...(limit && { limit })}
    />
  );
}

// the page filter that a group sets when a row is clicked
const FILTER_KEYS: Partial<
  Record<
    PartnerProfileEarningsAnalyticsGroupBy,
    "programId" | "linkId" | "type"
  >
> = {
  programId: "programId",
  linkId: "linkId",
  type: "type",
};

// the earnings of one group, with the filters and date range of the page
function useEarningsBreakdown(groupBy: PartnerProfileEarningsAnalyticsGroupBy) {
  const filters = usePartnerEarningsFilters();
  const { queryParams, searchParams } = useRouterStuff();

  const { data, error } = usePartnerProfileEarningsAnalytics({
    ...filters,
    groupBy,
    limit: EARNINGS_BREAKDOWN_LIMIT,
    // the previous data can belong to another group of the same card
    keepPreviousData: false,
  });

  const filterKey = FILTER_KEYS[groupBy];
  const filterValue = filterKey ? searchParams.get(filterKey) : null;

  const clearFilter = useCallback(() => {
    if (filterKey) {
      queryParams({ del: [filterKey, "page"] });
    }
  }, [filterKey, queryParams]);

  const rows = useMemo(
    () =>
      data &&
      getBreakdownRows({
        groupBy,
        data,
        getFilterHref: (value) =>
          filterKey
            ? (queryParams({
                set: { [filterKey]: value },
                del: "page",
                getNewPath: true,
              }) as string)
            : undefined,
      }),
    [data, groupBy, filterKey, queryParams],
  );

  return { rows, error, filterValue, clearFilter };
}

function getBreakdownRows({
  groupBy,
  data,
  getFilterHref,
}: {
  groupBy: PartnerProfileEarningsAnalyticsGroupBy;
  data: PartnerProfileEarningsAnalyticsByGroup[PartnerProfileEarningsAnalyticsGroupBy];
  getFilterHref: (value: string) => string | undefined;
}): BreakdownRow[] {
  switch (groupBy) {
    case "programId":
      return (data as PartnerProfileEarningsAnalyticsByGroup["programId"]).map(
        (program) => ({
          icon: <ProgramLogo program={program} className="size-4" />,
          title: program.name,
          value: program.earnings,
          href: getFilterHref(program.id),
        }),
      );
    case "linkId":
      return (data as PartnerProfileEarningsAnalyticsByGroup["linkId"]).map(
        (link) => ({
          icon: <ProgramLogo program={link.program} className="size-4" />,
          title: link.shortLink,
          value: link.earnings,
          href: getFilterHref(link.id),
        }),
      );
    case "type":
      return (data as PartnerProfileEarningsAnalyticsByGroup["type"]).map(
        ({ type, earnings }) => ({
          icon: <CommissionTypeIcon type={type} />,
          title: capitalize(type) ?? type,
          value: earnings,
          href: getFilterHref(type),
        }),
      );
    default:
      return getAttributeRows(groupBy, data);
  }
}

function getAttributeRows(
  groupBy: PartnerProfileEarningsAttributeGroupBy,
  data: PartnerProfileEarningsAnalyticsByGroup[PartnerProfileEarningsAnalyticsGroupBy],
): BreakdownRow[] {
  const UTMIcon = UTM_PARAMETERS.find(({ key }) => key === groupBy)?.icon;

  return (data as PartnerProfileEarningsAnalyticsByGroup[typeof groupBy]).map(
    (group) => {
      const value = (group as Record<string, string>)[groupBy];

      return {
        icon:
          groupBy === "country" ? (
            <CountryFlag countryCode={value} />
          ) : groupBy === "continent" ? (
            <ContinentIcon
              display={value}
              className="size-4 rounded-full border border-cyan-500"
            />
          ) : groupBy === "domain" ? (
            <ReferrerIcon display={value} />
          ) : UTMIcon ? (
            <UTMIcon className="size-4" />
          ) : null,
        title:
          groupBy === "country"
            ? COUNTRIES[value] ?? value
            : groupBy === "continent"
              ? CONTINENTS[value] ?? value
              : value,
        value: group.earnings,
      };
    },
  );
}
