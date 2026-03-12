"use client";

import useCommission from "@/lib/swr/use-commission";
import useGroups from "@/lib/swr/use-groups";
import useWorkspace from "@/lib/swr/use-workspace";
import { CommissionResponse } from "@/lib/types";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { CommissionTypeIcon } from "@/ui/partners/comission-type-icon";
import { CommissionRowMenu } from "@/ui/partners/commission-row-menu";
import { CommissionStatusBadges } from "@/ui/partners/commission-status-badges";
import { CommissionTypeBadge } from "@/ui/partners/commission-type-badge";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { ActivityEvent } from "@/ui/shared/activity-event";
import { ConditionalLink } from "@/ui/shared/conditional-link";
import {
  ChevronRight,
  CopyText,
  InvoiceDollar,
  StatusBadge,
  Table,
  useTable,
} from "@dub/ui";
import {
  cn,
  currencyFormatter,
  formatDateTime,
  nFormatter,
  OG_AVATAR_URL,
  pluralize,
} from "@dub/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Fragment } from "react";

export function CommissionDetailsPageClient() {
  const { slug } = useWorkspace();
  const { commission, loading, error } = useCommission();

  if (error?.status === 404) {
    redirect(`/${slug}/program/commissions`);
  }

  return (
    <PageContent
      title={
        loading ? (
          <div className="h-7 w-48 animate-pulse rounded-md bg-neutral-200" />
        ) : (
          <div className="flex items-center gap-1">
            <Link
              href={`/${slug}/program/commissions`}
              aria-label="Back to commissions"
              title="Back to commissions"
              className="bg-bg-subtle hover:bg-bg-emphasis flex size-8 shrink-0 items-center justify-center rounded-lg transition-[transform,background-color] duration-150 active:scale-95"
            >
              <InvoiceDollar className="size-4" />
            </Link>
            <div className="flex items-center gap-1.5">
              <ChevronRight className="text-content-subtle size-2.5 shrink-0 [&_*]:stroke-2" />
              <div className="flex items-center gap-2">
                {commission?.partner && (
                  <img
                    src={
                      commission.partner.image ||
                      `${OG_AVATAR_URL}${commission.partner.name}`
                    }
                    alt={commission.partner.name}
                    className="size-5 rounded-full"
                  />
                )}
                <span className="text-lg font-semibold leading-7 text-neutral-900">
                  {commission?.partner.name ?? "Commission details"}
                </span>
              </div>
            </div>
          </div>
        )
      }
    >
      <PageWidthWrapper className="pb-10">
        {commission ? (
          <CommissionDetailsContent commission={commission} slug={slug!} />
        ) : loading ? (
          <CommissionDetailSkeleton />
        ) : null}
      </PageWidthWrapper>
    </PageContent>
  );
}

function CommissionDetailsContent({
  commission,
  slug,
}: {
  commission: NonNullable<ReturnType<typeof useCommission>["commission"]>;
  slug: string;
}) {
  const { groups } = useGroups();
  const group = groups?.find((g) => g.id === commission.partner.groupId);
  const statusBadge = CommissionStatusBadges[commission.status];

  const itemsTable = useTable({
    data: [commission] as CommissionResponse[],
    columns: [
      {
        id: "item",
        header: "Item",
        minSize: 220,
        size: 220,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {["click", "custom"].includes(row.original.type) ? (
              <div className="flex size-6 items-center justify-center rounded-full bg-neutral-100">
                <CommissionTypeIcon
                  type={row.original.type}
                  className="size-4"
                />
              </div>
            ) : (
              <img
                src={
                  row.original.customer?.avatar ||
                  `${OG_AVATAR_URL}${row.original.customer?.id}`
                }
                alt={row.original.customer?.id ?? ""}
                className="size-6 rounded-full"
              />
            )}
            <div className="flex flex-col">
              <span className="w-44 truncate text-sm text-neutral-700">
                {row.original.type === "click"
                  ? `${nFormatter(row.original.quantity)} ${pluralize("click", row.original.quantity)}`
                  : row.original.customer
                    ? row.original.customer.email || row.original.customer.name
                    : "Custom commission"}
              </span>
              <span className="text-xs text-neutral-500">
                {formatDateTime(row.original.createdAt)}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: "type",
        header: "Type",
        minSize: 100,
        size: 120,
        maxSize: 150,
        cell: ({ row }) => (
          <CommissionTypeBadge type={row.original.type ?? "sale"} />
        ),
      },
      {
        id: "product",
        header: "Product",
        minSize: 120,
        size: 160,
        cell: ({ row }) => (
          <span className="text-sm text-neutral-600">
            {row.original.description || "—"}
          </span>
        ),
      },
      {
        id: "total",
        header: "Total",
        minSize: 80,
        size: 100,
        maxSize: 120,
        cell: ({ row }) => currencyFormatter(row.original.earnings),
      },
      {
        id: "menu",
        enableHiding: false,
        cell: ({ row }) => <CommissionRowMenu row={row} />,
      },
    ],
    columnPinning: { right: ["menu"] },
    thClassName: (id) =>
      cn(id === "menu" && "[&>div]:justify-end", "border-l-0"),
    tdClassName: (id) => cn(id === "menu" && "text-right", "border-l-0"),
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-[40px]",
    resourceName: (p) => `commission${p ? "s" : ""}`,
    loading: false,
    error: undefined,
  } as any);

  const detailRows: Record<string, React.ReactNode> = {
    Partner: (
      <ConditionalLink
        href={`/${slug}/program/partners/${commission.partner.id}`}
      >
        <img
          src={
            commission.partner.image ||
            `${OG_AVATAR_URL}${commission.partner.name}`
          }
          alt={commission.partner.name}
          className="mr-1.5 inline-flex size-5 rounded-full"
        />
        {commission.partner.name}
      </ConditionalLink>
    ),

    ...(group && {
      Group: (
        <Link
          href={`/${slug}/program/groups/${group.slug}`}
          className="flex items-center gap-1.5 text-neutral-800 hover:underline"
        >
          <GroupColorCircle group={group} />
          {group.name}
        </Link>
      ),
    }),

    Status: (
      <StatusBadge variant={statusBadge.variant} icon={statusBadge.icon}>
        {statusBadge.label}
      </StatusBadge>
    ),

    ...(commission.type === "sale" && {
      Amount: currencyFormatter(commission.amount),
    }),

    ...(commission.type === "click" && {
      Quantity: `${nFormatter(commission.quantity)} ${pluralize("click", commission.quantity)}`,
    }),

    Commission: (
      <span
        className={cn("font-medium", commission.earnings < 0 && "text-red-600")}
      >
        {currencyFormatter(commission.earnings)}
      </span>
    ),

    ...(commission.invoiceId && {
      Invoice: (
        <CopyText
          value={commission.invoiceId}
          className="block w-full truncate text-left font-mono text-sm text-neutral-500"
        >
          {commission.invoiceId}
        </CopyText>
      ),
    }),

    ...(commission.payoutId && {
      Payout: (
        <Link
          href={`/${slug}/program/payouts/${commission.payoutId}`}
          className="block truncate font-mono text-sm text-neutral-500 hover:underline"
          title={commission.payoutId}
        >
          {commission.payoutId}
        </Link>
      ),
    }),
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="order-last min-w-0 flex-1 lg:order-first">
        <Table {...itemsTable} />

        <div className="mt-6">
          <h3 className="mb-4 text-base font-medium text-neutral-900">
            Activity
          </h3>
          <div className="flex flex-col">
            {(
              [
                // Paid event
                ...(commission.status === "paid" && commission.payoutId
                  ? [
                      {
                        icon: CommissionStatusBadges["paid"].icon,
                        timestamp: commission.payout?.paidAt ?? null,
                        children: (
                          <>
                            <span className="text-sm text-neutral-700">
                              Commission
                            </span>
                            <StatusBadge
                              icon={null}
                              variant={CommissionStatusBadges["paid"].variant}
                            >
                              {CommissionStatusBadges["paid"].label}
                            </StatusBadge>
                            <span className="text-sm text-neutral-500">
                              on payout
                            </span>
                            <Link
                              href={`/${slug}/program/payouts/${commission.payoutId}`}
                              className="flex h-6 items-center gap-2 rounded-lg bg-neutral-100 px-2 py-1 hover:bg-neutral-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <InvoiceDollar className="size-4 shrink-0 text-neutral-500" />
                              <span className="max-w-[160px] truncate font-mono text-[13px] text-neutral-700">
                                {commission.payoutId}
                              </span>
                            </Link>
                          </>
                        ),
                      },
                    ]
                  : []),

                // Processed event
                ...(commission.status === "paid" ||
                commission.status === "processed"
                  ? [
                      {
                        icon: CommissionStatusBadges["processed"].icon,
                        timestamp: commission.payout?.initiatedAt ?? null,
                        children: (
                          <>
                            <span className="text-sm text-neutral-700">
                              Commission
                            </span>
                            <StatusBadge
                              icon={null}
                              variant={
                                CommissionStatusBadges["processed"].variant
                              }
                            >
                              {CommissionStatusBadges["processed"].label}
                            </StatusBadge>
                            {commission.payout?.user && (
                              <>
                                <span className="text-sm text-neutral-500">
                                  by
                                </span>
                                <div className="flex h-6 items-center gap-2 rounded-lg bg-neutral-100 px-2 py-1">
                                  <img
                                    src={
                                      commission.payout.user.image ||
                                      `${OG_AVATAR_URL}${commission.payout.user.id}`
                                    }
                                    alt={commission.payout.user.name ?? ""}
                                    className="size-4 rounded-full"
                                  />
                                  <span className="text-[13px] text-neutral-700">
                                    {commission.payout.user.name}
                                  </span>
                                </div>
                              </>
                            )}
                          </>
                        ),
                      },
                    ]
                  : []),

                // Pending / created event
                {
                  icon: CommissionStatusBadges["pending"].icon,
                  timestamp: commission.createdAt,
                  note: commission.reward?.description ?? undefined,
                  children: (
                    <>
                      <span className="text-sm text-neutral-700">
                        Commission
                      </span>
                      <StatusBadge
                        icon={null}
                        variant={CommissionStatusBadges["pending"].variant}
                      >
                        {CommissionStatusBadges["pending"].label}
                      </StatusBadge>
                    </>
                  ),
                },
              ] as {
                icon: React.ElementType;
                timestamp: string | Date | null | undefined;
                note?: string;
                children: React.ReactNode;
              }[]
            ).map((event, index, arr) => (
              <ActivityEvent
                key={index}
                icon={event.icon}
                timestamp={event.timestamp}
                note={event.note}
                isLast={index === arr.length - 1}
              >
                {event.children}
              </ActivityEvent>
            ))}
          </div>
        </div>
      </div>

      <div className="order-first w-full shrink-0 lg:order-last lg:w-[360px]">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h3 className="mb-4 text-base font-medium text-neutral-900">
            Commission details
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {Object.entries(detailRows).map(([key, value]) => (
              <Fragment key={key}>
                <div className="flex items-start pt-0.5 font-medium text-neutral-500">
                  {key}
                </div>
                <div className="min-w-0 text-neutral-500">{value}</div>
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CommissionDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="order-last min-w-0 flex-1 lg:order-first">
        <div className="h-32 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100" />
        <div className="mt-6 h-20 animate-pulse rounded-xl bg-neutral-100" />
      </div>
      <div className="order-first w-full shrink-0 lg:order-last lg:w-[360px]">
        <div className="h-64 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100" />
      </div>
    </div>
  );
}
