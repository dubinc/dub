"use client";

import { buildSocialPlatformLookup } from "@/lib/social-utils";
import { AdminNetworkPartner } from "@/lib/types";
import { NetworkStatusBadges } from "@/ui/partners/partner-network/network-status-badges";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { PartnerSocialColumn } from "@/ui/partners/partner-social-column";
import { CountryFlag } from "@/ui/shared/country-flag";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import { PartnerNetworkStatus, PlatformType } from "@dub/prisma/client";
import {
  Filter,
  StatusBadge,
  Table,
  TimestampTooltip,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { CircleDotted, FlagWavy } from "@dub/ui/icons";
import { cn, COUNTRIES, fetcher, formatDate } from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { NetworkPartnerApplicationSheet } from "app/(ee)/admin.dub.co/(dashboard)/partners/network/network-partner-application-sheet";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

const SOCIAL_FIELDS = [
  { id: "website", label: "Website" },
  { id: "youtube", label: "YouTube" },
  { id: "twitter", label: "X / Twitter" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
] as const;

export default function NetworkApplicationsPage() {
  const { queryParams, searchParams, searchParamsObj, getQueryString } =
    useRouterStuff();

  const [detailsSheetState, setDetailsSheetState] = useState<
    | { open: false; partnerId: string | null }
    | { open: true; partnerId: string }
  >({ open: false, partnerId: null });

  const {
    data: partners = [],
    isLoading,
    mutate,
  } = useSWR<AdminNetworkPartner[]>(
    `/api/admin/partners/network${getQueryString(undefined, {
      exclude: ["partnerId"],
    })}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const { data: partnersCount } = useSWR<{
    count: number;
  }>(
    `/api/admin/partners/network/count${getQueryString(undefined, {
      exclude: ["partnerId"],
    })}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const statusFilterOptions = useMemo(
    () =>
      Object.values(PartnerNetworkStatus).map((status) => {
        {
          const { label, icon: Icon, className } = NetworkStatusBadges[status];
          return {
            value: status,
            label,
            icon: <Icon className={cn(className, "size-4 bg-transparent")} />,
          };
        }
      }),
    [partners],
  );
  const filters = useMemo(
    () => [
      {
        key: "networkStatus",
        icon: CircleDotted,
        label: "Status",
        singleSelect: true,
        options: statusFilterOptions,
      },
      {
        key: "country",
        icon: FlagWavy,
        label: "Country",
        singleSelect: true,
        getOptionIcon: (value: string) => <CountryFlag countryCode={value} />,
        options: Object.entries(COUNTRIES).map(([key, value]) => ({
          value: key,
          label: value,
        })),
      },
    ],
    [statusFilterOptions],
  );
  const activeFilters = useMemo(() => {
    const active = [] as { key: string; value: string }[];

    if (searchParamsObj.networkStatus) {
      active.push({
        key: "networkStatus",
        value: searchParamsObj.networkStatus,
      });
    }

    if (searchParamsObj.country) {
      active.push({
        key: "country",
        value: searchParamsObj.country,
      });
    }

    return active;
  }, [searchParamsObj.country, searchParamsObj.networkStatus]);

  const platformsMapByPartnerId = useMemo(() => {
    const map = new Map<
      string,
      Record<
        PlatformType,
        NonNullable<AdminNetworkPartner["platforms"]>[number] | null
      >
    >();

    partners.forEach((partner) => {
      map.set(partner.id, buildSocialPlatformLookup(partner.platforms ?? []));
    });

    return map;
  }, [partners]);

  useEffect(() => {
    const partnerId = searchParams.get("partnerId");
    if (partnerId) {
      setDetailsSheetState({ open: true, partnerId });
      return;
    }

    setDetailsSheetState({ open: false, partnerId: null });
  }, [searchParams]);

  const currentPartner = useMemo(() => {
    if (!detailsSheetState.partnerId) {
      return null;
    }

    return (
      partners.find(({ id }) => id === detailsSheetState.partnerId) ?? null
    );
  }, [detailsSheetState.partnerId, partners]);

  const [previousPartnerId, nextPartnerId] = useMemo(() => {
    if (!detailsSheetState.partnerId) {
      return [null, null] as const;
    }

    const currentIndex = partners.findIndex(
      ({ id }) => id === detailsSheetState.partnerId,
    );

    if (currentIndex === -1) {
      return [null, null] as const;
    }

    return [
      currentIndex > 0 ? partners[currentIndex - 1]?.id ?? null : null,
      currentIndex < partners.length - 1
        ? partners[currentIndex + 1]?.id ?? null
        : null,
    ] as const;
  }, [detailsSheetState.partnerId, partners]);

  const onSelectFilter = (key: string, value: unknown) => {
    queryParams({
      set: {
        [key]: String(value),
      },
      del: "page",
    });
  };

  const onRemoveFilter = (key: string) => {
    queryParams({
      del: [key, "page"],
    });
  };

  const onRemoveAllFilters = () => {
    queryParams({
      del: ["networkStatus", "country", "page"],
    });
  };

  const handleReviewPartner = async (
    partner: AdminNetworkPartner,
    status: "approved" | "rejected",
  ) => {
    const currentIndex = partners.findIndex(({ id }) => id === partner.id);
    const fallbackPartnerId =
      (currentIndex !== -1 && partners[currentIndex + 1]?.id) ||
      (currentIndex !== -1 && partners[currentIndex - 1]?.id) ||
      null;

    try {
      const response = await fetch(
        `/api/admin/partners/${partner.id}/network-status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        },
      );

      if (!response.ok) {
        throw new Error((await response.text()) || "Failed to review partner.");
      }

      toast.success(
        status === "approved"
          ? "Partner approved for the network."
          : "Partner rejected from the network.",
      );

      await mutate();

      if (fallbackPartnerId) {
        queryParams({
          set: {
            partnerId: fallbackPartnerId,
          },
          scroll: false,
        });
      } else {
        setDetailsSheetState({ open: false, partnerId: null });
        queryParams({ del: "partnerId", scroll: false });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to review partner.",
      );
    }
  };

  const columns = useMemo(
    () => [
      {
        id: "partner",
        header: "Partner",
        minSize: 250,
        cell: ({ row }: { row: Row<AdminNetworkPartner> }) => (
          <PartnerRowItem
            partner={toEnrolledPartnerPreview(row.original)}
            showPermalink={false}
            showFraudIndicator={true}
          />
        ),
      },
      {
        id: "createdAt",
        header: "Joined",
        cell: ({ row }: { row: Row<AdminNetworkPartner> }) => (
          <TimestampTooltip
            timestamp={row.original.createdAt}
            rows={["local", "utc", "unix"]}
            side="right"
            delayDuration={150}
          >
            <span>
              {formatDate(row.original.createdAt, { month: "short" })}
            </span>
          </TimestampTooltip>
        ),
      },
      {
        id: "networkStatus",
        header: "Status",
        minSize: 140,
        cell: ({ row }: { row: Row<AdminNetworkPartner> }) => {
          const networkStatusBadge =
            NetworkStatusBadges[row.original.networkStatus];
          const { label, icon } = networkStatusBadge;
          return (
            <StatusBadge variant={networkStatusBadge.variant} icon={icon}>
              {label}
            </StatusBadge>
          );
        },
      },
      {
        id: "location",
        header: "Location",
        minSize: 150,
        cell: ({ row }: { row: Row<AdminNetworkPartner> }) => {
          const country = row.original.country;
          return (
            <div className="flex items-center gap-2">
              {country && <CountryFlag countryCode={country} />}
              <span className="min-w-0 truncate">
                {(country ? COUNTRIES[country] : null) ?? "-"}
              </span>
            </div>
          );
        },
      },
      ...SOCIAL_FIELDS.map(({ id, label }) => ({
        id,
        header: label,
        minSize: 150,
        cell: ({ row }: { row: Row<AdminNetworkPartner> }) => {
          const platformsMap = platformsMapByPartnerId.get(row.original.id);
          return (
            <PartnerSocialColumn
              platform={platformsMap?.[id] ?? null}
              platformName={id}
            />
          );
        },
      })),
    ],
    [platformsMapByPartnerId],
  );

  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const { pagination, setPagination } = usePagination();

  const { table, ...tableProps } = useTable<AdminNetworkPartner>({
    data: partners,
    columns,
    onRowClick: (row) =>
      queryParams({
        set: {
          partnerId: row.original.id,
        },
        scroll: false,
      }),
    loading: isLoading,
    sortableColumns: ["createdAt"],
    sortBy,
    sortOrder,
    onSortChange: ({ sortBy, sortOrder }) =>
      queryParams({
        set: {
          ...(sortBy && { sortBy }),
          ...(sortOrder && { sortOrder }),
        },
        del: "page",
        scroll: false,
      }),

    pagination,
    onPaginationChange: setPagination,
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (plural) => `partner${plural ? "s" : ""}`,
    rowCount: partnersCount?.count ?? 0,
  });

  return (
    <>
      {currentPartner && (
        <NetworkPartnerApplicationSheet
          isOpen={detailsSheetState.open}
          partner={currentPartner}
          onPrevious={
            previousPartnerId
              ? () =>
                  queryParams({
                    set: {
                      partnerId: previousPartnerId,
                    },
                    scroll: false,
                  })
              : undefined
          }
          onNext={
            nextPartnerId
              ? () =>
                  queryParams({
                    set: {
                      partnerId: nextPartnerId,
                    },
                    scroll: false,
                  })
              : undefined
          }
          setIsOpen={(open) => {
            setDetailsSheetState((state) => ({ ...state, open }) as any);
          }}
          onReview={handleReviewPartner}
        />
      )}
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex w-full flex-col gap-2 min-[550px]:flex-row min-[550px]:items-center min-[550px]:justify-between">
          <Filter.Select
            className="w-full md:w-fit"
            filters={filters}
            activeFilters={activeFilters}
            onSelect={onSelectFilter}
            onRemove={onRemoveFilter}
          />
          <SearchBoxPersisted
            placeholder="Search by partner email"
            inputClassName="w-full md:w-80"
          />
        </div>
        {activeFilters.length > 0 && (
          <Filter.List
            filters={filters}
            activeFilters={activeFilters}
            onSelect={onSelectFilter}
            onRemove={onRemoveFilter}
            onRemoveAll={onRemoveAllFilters}
          />
        )}
      </div>
      <Table
        {...tableProps}
        table={table}
        containerClassName="max-h-[calc(70dvh)] overflow-auto"
      />
    </>
  );
}

function toEnrolledPartnerPreview(partner: AdminNetworkPartner) {
  return {
    id: partner.id,
    name: partner.name,
    email: partner.email,
    image: partner.image,
    country: partner.country,
    status: "pending",
  } as const;
}
