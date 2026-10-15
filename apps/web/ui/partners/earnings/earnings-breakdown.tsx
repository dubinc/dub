"use client";

import { usePartnerProfileEarningsAnalytics } from "@/lib/swr/use-partner-profile-earnings";
import {
  PartnerProfileEarningsAnalyticsByGroup,
  PartnerProfileEarningsAnalyticsGroupBy,
  PartnerProfileEarningsAttributeGroupBy,
} from "@/lib/types";
import { PARTNER_PROFILE_EARNINGS_UTM_GROUP_BY } from "@/lib/zod/schemas/partner-profile";
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
import { ReactNode, useMemo, useState } from "react";
import { usePartnerEarningsFilters } from "./use-partner-earnings-filters";

// the most groups the earnings analytics route returns. "View all" lists all of them
const EARNINGS_BREAKDOWN_LIMIT = 100;

const EARNINGS_METRIC = { label: "Earnings", icon: CircleDollar };

type BreakdownGroupBy = PartnerProfileEarningsAnalyticsGroupBy;

// one group of the earnings analytics route
type BreakdownGroup<G extends BreakdownGroupBy> =
  PartnerProfileEarningsAnalyticsByGroup[G][number];

type BreakdownRow = {
  icon: ReactNode;
  title: string;
  value: number;
  filterValue?: string; // the page filter that a click on this row sets
};

// the page filter that the rows of a card set
type BreakdownFilter = {
  value: string | null;
  set: (value: string) => void;
  clear: () => void;
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
  const { rows, error, filter } = useEarningsBreakdown("programId");

  return (
    <AnalyticsCard
      tabs={[{ id: "programs", label: "Programs", icon: GridIcon }]}
      selectedTabId="programs"
      expandLimit={8}
      dataLength={rows?.length}
      isFilterActive={!!filter.value}
      onClearFilter={filter.clear}
      metric={EARNINGS_METRIC}
    >
      {({ limit, setShowModal }) => (
        <EarningsBarList
          filter={filter}
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

const LINK_SUBTABS: { id: BreakdownGroupBy; label: string }[] = [
  { id: "domain", label: "Domain" },
  { id: "linkId", label: "URL" },
];

const UTM_SUBTABS: { id: BreakdownGroupBy; label: string }[] =
  PARTNER_PROFILE_EARNINGS_UTM_GROUP_BY.map((key) => ({
    id: key,
    label: UTM_PARAMETERS.find((param) => param.key === key)?.label ?? key,
  }));

function LinksCard() {
  const [tab, setTab] = useState<"links" | "utms">("links");
  const [subtab, setSubtab] = useState<BreakdownGroupBy>("domain");

  const subtabs = tab === "links" ? LINK_SUBTABS : UTM_SUBTABS;

  const { rows, error, filter } = useEarningsBreakdown(subtab);

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
      subTabs={subtabs}
      selectedSubTabId={subtab}
      onSelectSubTab={(id) => {
        const selected = subtabs.find((option) => option.id === id);
        if (selected) setSubtab(selected.id);
      }}
      expandLimit={8}
      dataLength={rows?.length}
      isFilterActive={!!filter.value}
      onClearFilter={filter.clear}
      metric={EARNINGS_METRIC}
    >
      {({ limit, setShowModal }) => (
        <EarningsBarList
          filter={filter}
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
  const { rows, error, filter } = useEarningsBreakdown("type");

  return (
    <AnalyticsCard
      tabs={[{ id: "type", label: "Type", icon: MoneyBills2 }]}
      selectedTabId="type"
      expandLimit={8}
      dataLength={rows?.length}
      isFilterActive={!!filter.value}
      onClearFilter={filter.clear}
      metric={EARNINGS_METRIC}
    >
      {({ limit, setShowModal }) => (
        <EarningsBarList
          filter={filter}
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
  filter,
  limit,
  setShowModal,
  barBackground,
  hoverBackground,
}: {
  tab: string;
  rows?: BreakdownRow[];
  error?: unknown;
  filter?: BreakdownFilter;
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
      {...(filter && {
        activeFilterValues: filter.value ? [filter.value] : [],
        onRowFilterItem: filter.set,
        // the earnings filters take one value, so the modal applies the last selected row
        onApplyFilterValues: (values: string[]) =>
          values.length > 0
            ? filter.set(values[values.length - 1])
            : filter.clear(),
        onClearFilter: filter.clear,
      })}
      {...(limit && { limit })}
    />
  );
}

// the page filter that a group sets when a row is clicked
const FILTER_KEYS: Partial<
  Record<BreakdownGroupBy, "programId" | "linkId" | "type">
> = {
  programId: "programId",
  linkId: "linkId",
  type: "type",
};

// the earnings of one group, with the filters and date range of the page
function useEarningsBreakdown(groupBy: BreakdownGroupBy) {
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

  // set with queryParams, which keeps the scroll position of the page
  const filter = useMemo<BreakdownFilter>(
    () => ({
      value: filterKey ? searchParams.get(filterKey) : null,
      set: (value) => {
        if (filterKey) {
          queryParams({ set: { [filterKey]: value }, del: "page" });
        }
      },
      clear: () => {
        if (filterKey) {
          queryParams({ del: [filterKey, "page"] });
        }
      },
    }),
    [filterKey, searchParams, queryParams],
  );

  const rows = useMemo(
    () => data && getBreakdownRows(groupBy, data),
    [data, groupBy],
  );

  return { rows, error, filter };
}

function getBreakdownRows<G extends BreakdownGroupBy>(
  groupBy: G,
  data: BreakdownGroup<G>[],
) {
  const toRow: (group: BreakdownGroup<G>) => BreakdownRow =
    BREAKDOWN_ROWS[groupBy];

  return data.map(toRow);
}

// the row of each group
const BREAKDOWN_ROWS: {
  [G in BreakdownGroupBy]: (group: BreakdownGroup<G>) => BreakdownRow;
} = {
  programId: (program) => ({
    icon: <ProgramLogo program={program} className="size-4" />,
    title: program.name,
    value: program.earnings,
    filterValue: program.id,
  }),
  linkId: (link) => ({
    icon: <ProgramLogo program={link.program} className="size-4" />,
    title: link.shortLink,
    value: link.earnings,
    filterValue: link.id,
  }),
  type: ({ type, earnings }) => ({
    icon: <CommissionTypeIcon type={type} />,
    title: capitalize(type) ?? type,
    value: earnings,
    filterValue: type,
  }),
  domain: getAttributeRow("domain"),
  utm_source: getAttributeRow("utm_source"),
  utm_medium: getAttributeRow("utm_medium"),
  utm_campaign: getAttributeRow("utm_campaign"),
  utm_term: getAttributeRow("utm_term"),
  utm_content: getAttributeRow("utm_content"),
  country: getAttributeRow("country"),
  continent: getAttributeRow("continent"),
};

function getAttributeRow<G extends PartnerProfileEarningsAttributeGroupBy>(
  groupBy: G,
) {
  const UTMIcon = UTM_PARAMETERS.find(({ key }) => key === groupBy)?.icon;

  return (group: Record<G, string> & { earnings: number }): BreakdownRow => {
    const value = group[groupBy];

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
  };
}
