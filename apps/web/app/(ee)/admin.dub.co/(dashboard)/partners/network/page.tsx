"use client";

import { buildSocialPlatformLookup } from "@/lib/social-utils";
import { AdminNetworkPartner } from "@/lib/types";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { PartnerSocialColumn } from "@/ui/partners/partner-social-column";
import { CountryFlag } from "@/ui/shared/country-flag";
import { PlatformType } from "@dub/prisma/client";
import { Table, useRouterStuff, useTable } from "@dub/ui";
import { COUNTRIES, fetcher, formatDateTime } from "@dub/utils";
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
  const { queryParams, searchParams } = useRouterStuff();

  const [detailsSheetState, setDetailsSheetState] = useState<
    { open: false; partnerId: null } | { open: true; partnerId: string }
  >({ open: false, partnerId: null });

  const { data, isLoading, mutate } = useSWR<{
    partners: AdminNetworkPartner[];
  }>("/api/admin/partners/network", fetcher, {
    keepPreviousData: true,
  });

  const partners = data?.partners ?? [];
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
      {
        id: "createdAt",
        header: "Applied",
        accessorFn: (d: AdminNetworkPartner) => formatDateTime(d.createdAt),
      },
    ],
    [platformsMapByPartnerId],
  );

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
    sortBy: "createdAt",
    sortOrder: "desc",
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (plural) => `application${plural ? "s" : ""}`,
    rowCount: partners.length,
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
            if (!open) {
              setDetailsSheetState({ open: false, partnerId: null });
              queryParams({ del: "partnerId", scroll: false });
            } else if (detailsSheetState.partnerId) {
              setDetailsSheetState({
                open: true,
                partnerId: detailsSheetState.partnerId,
              });
            }
          }}
          onReview={handleReviewPartner}
        />
      )}
      <Table {...tableProps} table={table} />
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
