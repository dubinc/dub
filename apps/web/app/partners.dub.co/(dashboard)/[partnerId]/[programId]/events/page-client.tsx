"use client";

import {
  INTERVAL_DATA,
  INTERVAL_DISPLAYS,
  TRIGGER_DISPLAY,
  VALID_ANALYTICS_FILTERS,
} from "@/lib/analytics/constants";
import AnalyticsProvider, {
  AnalyticsContext,
} from "@/ui/analytics/analytics-provider";
import ContinentIcon from "@/ui/analytics/continent-icon";
import DeviceIcon from "@/ui/analytics/device-icon";
import EventsTable from "@/ui/analytics/events/events-table";
import EventsTabs from "@/ui/analytics/events/events-tabs";
import RefererIcon from "@/ui/analytics/referer-icon";
import { useAnalyticsFilterOption } from "@/ui/analytics/utils";
import {
  DateRangePicker,
  Filter,
  LinkLogo,
  MaxWidthWrapper,
  useRouterStuff,
} from "@dub/ui";
import {
  Cube,
  CursorRays,
  FlagWavy,
  LinkBroken,
  MapPosition,
  MobilePhone,
  OfficeBuilding,
  QRCode,
  ReferredVia,
  Window,
} from "@dub/ui/src/icons";
import {
  capitalize,
  cn,
  CONTINENTS,
  COUNTRIES,
  getApexDomain,
  nFormatter,
} from "@dub/utils";
import { useParams } from "next/navigation";
import {
  ComponentProps,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export function EventsPageClient() {
  const { partnerId, programId } = useParams() as {
    partnerId: string;
    programId: string;
  };

  return (
    <MaxWidthWrapper>
      <AnalyticsProvider
        partnerId={partnerId}
        programId={programId}
        defaultInterval="30d"
      >
        <div className="pb-10">
          <EventsFilters />
          <div className="mx-auto mt-3 flex max-w-screen-xl flex-col gap-3">
            <EventsTabs conversionEnabled />
            <EventsTableContainer />
          </div>
        </div>
      </AnalyticsProvider>
    </MaxWidthWrapper>
  );
}

function EventsTableContainer() {
  const { selectedTab } = useContext(AnalyticsContext);

  return <EventsTable key={selectedTab} partners />;
}

function EventsFilters() {
  const { queryParams, searchParamsObj } = useRouterStuff();
  const { start, end, interval } = useContext(AnalyticsContext);

  const [requestedFilters, setRequestedFilters] = useState<string[]>([]);

  const activeFilters = useMemo(() => {
    const {
      continent,
      country,
      city,
      device,
      browser,
      os,
      trigger,
      referer,
      refererUrl,
      url,
    } = searchParamsObj;
    return [
      ...(continent ? [{ key: "continent", value: continent }] : []),
      ...(country ? [{ key: "country", value: country }] : []),
      ...(city ? [{ key: "city", value: city }] : []),
      ...(device ? [{ key: "device", value: device }] : []),
      ...(browser ? [{ key: "browser", value: browser }] : []),
      ...(os ? [{ key: "os", value: os }] : []),
      ...(trigger ? [{ key: "trigger", value: trigger }] : []),
      ...(referer ? [{ key: "referer", value: referer }] : []),
      ...(refererUrl ? [{ key: "refererUrl", value: refererUrl }] : []),
      ...(url ? [{ key: "url", value: url }] : []),
    ];
  }, [searchParamsObj]);

  const isRequested = useCallback(
    (key: string) =>
      requestedFilters.includes(key) ||
      activeFilters.some((af) => af.key === key),
    [requestedFilters, activeFilters],
  );

  const countries = useAnalyticsFilterOption("countries", {
    cacheOnly: !isRequested("country"),
  });
  const cities = useAnalyticsFilterOption("cities", {
    cacheOnly: !isRequested("city"),
  });
  const continents = useAnalyticsFilterOption("continents", {
    cacheOnly: !isRequested("continent"),
  });
  const devices = useAnalyticsFilterOption("devices", {
    cacheOnly: !isRequested("device"),
  });
  const browsers = useAnalyticsFilterOption("browsers", {
    cacheOnly: !isRequested("browser"),
  });
  const os = useAnalyticsFilterOption("os", {
    cacheOnly: !isRequested("os"),
  });
  const triggers = useAnalyticsFilterOption("triggers", {
    cacheOnly: !isRequested("trigger"),
  });
  const referers = useAnalyticsFilterOption("referers", {
    cacheOnly: !isRequested("referer"),
  });
  const refererUrls = useAnalyticsFilterOption("referer_urls", {
    cacheOnly: !isRequested("refererUrl"),
  });
  const urls = useAnalyticsFilterOption("top_urls", {
    cacheOnly: !isRequested("url"),
  });

  const filters: ComponentProps<typeof Filter.Select>["filters"] = useMemo(
    () => [
      {
        key: "trigger",
        icon: CursorRays,
        label: "Trigger",
        options:
          triggers?.map(({ trigger, count }) => ({
            value: trigger,
            label: TRIGGER_DISPLAY[trigger],
            icon: trigger === "qr" ? QRCode : CursorRays,
            right: nFormatter(count, { full: true }),
          })) ?? null,
      },
      {
        key: "country",
        icon: FlagWavy,
        label: "Country",
        getOptionIcon: (value) => (
          <img
            alt={value}
            src={`https://flag.vercel.app/m/${value}.svg`}
            className="h-2.5 w-4"
          />
        ),
        getOptionLabel: (value) => COUNTRIES[value],
        options:
          countries?.map(({ country, count }) => ({
            value: country,
            label: COUNTRIES[country],
            right: nFormatter(count, { full: true }),
          })) ?? null,
      },
      {
        key: "city",
        icon: OfficeBuilding,
        label: "City",
        options:
          cities?.map(({ city, country, count }) => ({
            value: city,
            label: city,
            icon: (
              <img
                alt={country}
                src={`https://flag.vercel.app/m/${country}.svg`}
                className="h-2.5 w-4"
              />
            ),
            right: nFormatter(count, { full: true }),
          })) ?? null,
      },
      {
        key: "continent",
        icon: MapPosition,
        label: "Continent",
        getOptionIcon: (value) => (
          <ContinentIcon display={value} className="size-2.5" />
        ),
        getOptionLabel: (value) => CONTINENTS[value],
        options:
          continents?.map(({ continent, count }) => ({
            value: continent,
            label: CONTINENTS[continent],
            right: nFormatter(count, { full: true }),
          })) ?? null,
      },
      {
        key: "device",
        icon: MobilePhone,
        label: "Device",
        getOptionIcon: (value) => (
          <DeviceIcon
            display={capitalize(value) ?? value}
            tab="devices"
            className="h-4 w-4"
          />
        ),
        options:
          devices?.map(({ device, count }) => ({
            value: device,
            label: device,
            right: nFormatter(count, { full: true }),
          })) ?? null,
      },
      {
        key: "browser",
        icon: Window,
        label: "Browser",
        getOptionIcon: (value) => (
          <DeviceIcon display={value} tab="browsers" className="h-4 w-4" />
        ),
        options:
          browsers?.map(({ browser, count }) => ({
            value: browser,
            label: browser,
            right: nFormatter(count, { full: true }),
          })) ?? null,
      },
      {
        key: "os",
        icon: Cube,
        label: "OS",
        getOptionIcon: (value) => (
          <DeviceIcon display={value} tab="os" className="h-4 w-4" />
        ),
        options:
          os?.map(({ os, count }) => ({
            value: os,
            label: os,
            right: nFormatter(count, { full: true }),
          })) ?? null,
      },
      {
        key: "referer",
        icon: ReferredVia,
        label: "Referer",
        getOptionIcon: (value, props) => (
          <RefererIcon display={value} className="h-4 w-4" />
        ),
        options:
          referers?.map(({ referer, count }) => ({
            value: referer,
            label: referer,
            right: nFormatter(count, { full: true }),
          })) ?? null,
      },
      {
        key: "refererUrl",
        icon: ReferredVia,
        label: "Referrer URL",
        getOptionIcon: (value, props) => (
          <RefererIcon display={value} className="h-4 w-4" />
        ),
        options:
          refererUrls?.map(({ refererUrl, count }) => ({
            value: refererUrl,
            label: refererUrl,
            right: nFormatter(count, { full: true }),
          })) ?? null,
      },
      {
        key: "url",
        icon: LinkBroken,
        label: "Destination URL",
        getOptionIcon: (_, props) => (
          <LinkLogo
            apexDomain={getApexDomain(props.option?.value)}
            className="size-4 sm:size-4"
          />
        ),
        options:
          urls?.map(({ url, count }) => ({
            value: url,
            label: url.replace(/^https?:\/\//, "").replace(/\/$/, ""),
            right: nFormatter(count, { full: true }),
          })) ?? null,
      },
    ],
    [countries, cities, devices, browsers, os, referers, refererUrls, urls],
  );

  return (
    <div>
      <div className="flex items-center gap-2">
        <Filter.Select
          className="w-full md:w-fit"
          filters={filters}
          activeFilters={activeFilters}
          onSelect={async (key, value) => {
            queryParams({
              set: {
                [key]: value,
              },
              del: "page",
            });
          }}
          onRemove={(key) =>
            queryParams({
              del: key === "link" ? ["domain", "key"] : key,
            })
          }
          onOpenFilter={(key) =>
            setRequestedFilters((rf) => (rf.includes(key) ? rf : [...rf, key]))
          }
        />
        <DateRangePicker
          className="w-full sm:min-w-[200px] md:w-fit"
          align="start"
          value={
            start && end
              ? {
                  from: start,
                  to: end,
                }
              : undefined
          }
          presetId={!start || !end ? interval ?? "24h" : undefined}
          onChange={(range, preset) => {
            if (preset) {
              queryParams({
                del: ["start", "end"],
                set: {
                  interval: preset.id,
                },
                scroll: false,
              });

              return;
            }

            // Regular range
            if (!range || !range.from || !range.to) return;

            queryParams({
              del: "interval",
              set: {
                start: range.from.toISOString(),
                end: range.to.toISOString(),
              },
              scroll: false,
            });
          }}
          presets={INTERVAL_DISPLAYS.map(({ display, value, shortcut }) => {
            const start = INTERVAL_DATA[value].startDate;
            const end = new Date();

            return {
              id: value,
              label: display,
              dateRange: {
                from: start,
                to: end,
              },
              shortcut,
            };
          })}
        />
      </div>
      <div className={cn(activeFilters.length && "mt-3")}>
        <Filter.List
          filters={filters}
          activeFilters={activeFilters}
          onRemove={(key) =>
            queryParams({
              del: key === "link" ? ["domain", "key", "url"] : key,
              scroll: false,
            })
          }
          onRemoveAll={() =>
            queryParams({
              // Reset all filters except for date range
              del: VALID_ANALYTICS_FILTERS.concat(["page"]).filter(
                (f) => !["interval", "start", "end"].includes(f),
              ),
              scroll: false,
            })
          }
        />
      </div>
    </div>
  );
}
