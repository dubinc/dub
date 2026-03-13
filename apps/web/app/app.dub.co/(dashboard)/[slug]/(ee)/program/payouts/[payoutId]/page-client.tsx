"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import usePayout from "@/lib/swr/use-payout";
import useWorkspace from "@/lib/swr/use-workspace";
import { CommissionResponse } from "@/lib/types";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ActivityEvent } from "@/ui/partners/activity-event";
import { CommissionTypeIcon } from "@/ui/partners/comission-type-icon";
import { CommissionRowMenu } from "@/ui/partners/commission-row-menu";
import { CommissionTypeBadge } from "@/ui/partners/commission-type-badge";
import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import { ConditionalLink } from "@/ui/shared/conditional-link";
import { PayoutStatus } from "@dub/prisma/client";
import {
  Button,
  buttonVariants,
  ChevronRight,
  CircleArrowRight,
  CopyText,
  InvoiceDollar,
  MoneyBills2,
  StatusBadge,
  Table,
  TimestampTooltip,
  Tooltip,
  usePagination,
  useTable,
} from "@dub/ui";
import {
  APP_DOMAIN,
  cn,
  currencyFormatter,
  fetcher,
  formatDateTime,
  formatDateTimeSmart,
  OG_AVATAR_URL,
  pluralize,
} from "@dub/utils";
import { formatPeriod } from "@dub/utils/src/functions/datetime";
import Link from "next/link";
import { redirect, useRouter } from "next/navigation";
import { Fragment, useMemo } from "react";
import useSWR from "swr";

export function PayoutDetailsPageClient() {
  const { slug, id: workspaceId, role } = useWorkspace();
  const { payout, loading, error } = usePayout();
  const router = useRouter();

  const { error: _permissionsError } = clientAccessCheck({
    action: "payouts.write",
    role,
  });
  const permissionsError =
    typeof _permissionsError === "string" ? _permissionsError : null;

  if (error?.status === 404) {
    redirect(`/${slug}/program/payouts`);
  }

  return (
    <PageContent
      title={
        loading ? (
          <div className="h-7 w-40 animate-pulse rounded-md bg-neutral-200" />
        ) : (
          <div className="flex items-center gap-1">
            <Link
              href={`/${slug}/program/payouts`}
              aria-label="Back to payouts"
              title="Back to payouts"
              className="bg-bg-subtle hover:bg-bg-emphasis flex size-8 shrink-0 items-center justify-center rounded-lg transition-[transform,background-color] duration-150 active:scale-95"
            >
              <MoneyBills2 className="size-4" />
            </Link>
            <div className="flex items-center gap-1.5">
              <ChevronRight className="text-content-subtle size-2.5 shrink-0 [&_*]:stroke-2" />
              <div className="flex items-center gap-2">
                {payout?.partner && (
                  <img
                    src={
                      payout.partner.image ||
                      `${OG_AVATAR_URL}${payout.partner.name}`
                    }
                    alt={payout.partner.name}
                    className="size-5 rounded-full"
                  />
                )}
                <span className="text-lg font-semibold leading-7 text-neutral-900">
                  {payout?.partner?.name ?? "Payout details"}
                </span>
              </div>
            </div>
          </div>
        )
      }
      controls={
        payout?.status === "pending" ? (
          <div className="flex items-center gap-2">
            <Button
              text="Confirm payout"
              disabledTooltip={
                !payout.partner.payoutsEnabledAt
                  ? "This partner has not [connected a bank account](https://dub.co/help/article/receiving-payouts) to receive payouts yet, which means they won't be able to receive payouts from your program."
                  : permissionsError || undefined
              }
              onClick={() => {
                router.push(
                  `/${slug}/program/payouts?confirmPayouts=true&selectedPayoutId=${payout.id}`,
                );
              }}
            />
          </div>
        ) : undefined
      }
    >
      <PageWidthWrapper className="pb-10">
        {payout ? (
          <PayoutDetailsContent
            payout={payout}
            workspaceId={workspaceId!}
            slug={slug!}
            router={router}
          />
        ) : loading ? (
          <PayoutDetailsskeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-sm font-medium text-neutral-700">
              Failed to load payout
            </p>
            <p className="text-sm text-neutral-500">{error.message}</p>
          </div>
        ) : null}
      </PageWidthWrapper>
    </PageContent>
  );
}

function PayoutDetailsContent({
  payout,
  workspaceId,
  slug,
  router,
}: {
  payout: NonNullable<ReturnType<typeof usePayout>["payout"]>;
  workspaceId: string;
  slug: string;
  router: ReturnType<typeof useRouter>;
}) {
  const { pagination, setPagination } = usePagination(10);

  const {
    data: commissions,
    isLoading,
    error,
  } = useSWR<CommissionResponse[]>(
    `/api/commissions?${new URLSearchParams({
      workspaceId,
      payoutId: payout.id,
      interval: "all",
      page: String(pagination.pageIndex),
      pageSize: String(pagination.pageSize),
    })}`,
    fetcher,
    { keepPreviousData: true },
  );

  const { data: commissionsCount } = useSWR<{ all: { count: number } }>(
    `/api/commissions/count?${new URLSearchParams({
      workspaceId,
      payoutId: payout.id,
      interval: "all",
    })}`,
    fetcher,
  );

  const invoiceData = useMemo(() => {
    const statusBadge = PayoutStatusBadges[payout.status];

    return {
      Partner: (
        <ConditionalLink
          href={`/${slug}/program/partners/${payout.partner.id}`}
          target="_blank"
        >
          <img
            src={
              payout.partner.image || `${OG_AVATAR_URL}${payout.partner.name}`
            }
            alt={payout.partner.name}
            className="mr-1.5 inline-flex size-5 rounded-full"
          />
          {payout.partner.name}
        </ConditionalLink>
      ),

      Period: formatPeriod({
        periodStart: payout.periodStart ? new Date(payout.periodStart) : null,
        periodEnd: payout.periodEnd ? new Date(payout.periodEnd) : null,
      }),

      Status: (
        <StatusBadge variant={statusBadge.variant} icon={statusBadge.icon}>
          {statusBadge.label}
        </StatusBadge>
      ),

      Initiated: payout.initiatedAt ? (
        <TimestampTooltip
          timestamp={payout.initiatedAt}
          side="left"
          rows={["local", "utc"]}
        >
          <span className="hover:text-content-emphasis underline decoration-dotted underline-offset-2">
            {formatDateTimeSmart(payout.initiatedAt)}
          </span>
        </TimestampTooltip>
      ) : (
        "-"
      ),

      Paid: payout.paidAt ? (
        <TimestampTooltip
          timestamp={payout.paidAt}
          side="left"
          rows={["local", "utc"]}
        >
          <span className="hover:text-content-emphasis underline decoration-dotted underline-offset-2">
            {formatDateTimeSmart(payout.paidAt)}
          </span>
        </TimestampTooltip>
      ) : (
        "-"
      ),

      Amount: (
        <div className="flex items-center gap-2">
          {currencyFormatter(payout.amount)}

          {payout.mode === "external" && (
            <Tooltip
              content={
                payout.status === PayoutStatus.pending
                  ? `This payout will be made externally through the partner's account after approval.`
                  : `This payout was made externally through the partner's account.`
              }
            >
              <CircleArrowRight className="size-3.5 shrink-0 text-neutral-500" />
            </Tooltip>
          )}

          {payout.mode === "internal" && payout.status !== "failed" && (
            <Tooltip content="View invoice">
              <div className="flex h-5 w-5 items-center justify-center rounded-md transition-colors duration-150 hover:border hover:border-neutral-200 hover:bg-neutral-100">
                <Link
                  href={`${APP_DOMAIN}/invoices/${payout.invoiceId || payout.id}`}
                  className="text-neutral-700"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <InvoiceDollar className="size-4" />
                </Link>
              </div>
            </Tooltip>
          )}
        </div>
      ),

      ...(payout.invoiceId && {
        Invoice: (
          <ConditionalLink
            href={`${APP_DOMAIN}/invoices/${payout.invoiceId}`}
            target="_blank"
            className="block truncate font-mono text-sm text-neutral-500"
            title={payout.invoiceId}
          >
            {payout.invoiceId}
          </ConditionalLink>
        ),
      }),

      ...(payout.description && {
        Description: payout.description,
      }),

      ...(payout.traceId && {
        "Trace ID": (
          <CopyText
            value={payout.traceId}
            className="block w-full truncate text-left font-mono text-sm text-neutral-500"
          >
            {payout.traceId}
          </CopyText>
        ),
      }),
    };
  }, [payout, slug]);

  const activityItems = useMemo(() => {
    type ActivityItem = {
      status: keyof typeof PayoutStatusBadges;
      timestamp: string | Date | null;
      user?: {
        name?: string | null;
        image?: string | null;
        id?: string;
      } | null;
    };

    const items: ActivityItem[] = [
      { status: "pending", timestamp: payout.createdAt },
    ];

    if (payout.initiatedAt) {
      items.push({
        status: "processed",
        timestamp: payout.initiatedAt,
        user: payout.user,
      });
    }

    const terminalStatuses = [
      "completed",
      "sent",
      "failed",
      "canceled",
      "hold",
    ] as const;
    const terminalStatus = terminalStatuses.find((s) => s === payout.status);

    if (terminalStatus) {
      const timestamp = payout.paidAt ?? payout.updatedAt ?? null;
      items.push({ status: terminalStatus, timestamp });
    }

    return items.reverse();
  }, [payout]);

  const commissionsTable = useTable({
    data:
      commissions?.filter(
        ({ status }) => !["duplicate", "fraud"].includes(status),
      ) || [],
    columns: [
      {
        header: "Details",
        minSize: 300,
        size: 9999,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {["click", "custom"].includes(row.original.type) ||
            !row.original.customer ? (
              <div className="flex size-6 items-center justify-center rounded-full bg-neutral-100">
                <CommissionTypeIcon
                  type={row.original.type}
                  className="size-4"
                />
              </div>
            ) : (
              <img
                src={
                  row.original.customer.avatar ||
                  `${OG_AVATAR_URL}${row.original.customer.id}`
                }
                alt={row.original.customer.id}
                className="size-6 rounded-full"
              />
            )}

            <div className="flex flex-col">
              {row.original.customer ? (
                <Link
                  href={`/${slug}/program/customers/${row.original.customer.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="max-w-xs truncate text-sm text-neutral-700 hover:underline"
                >
                  {row.original.customer.email || row.original.customer.name}
                </Link>
              ) : (
                <span className="max-w-xs truncate text-sm text-neutral-700">
                  {row.original.type === "click"
                    ? `${row.original.quantity} ${pluralize("click", row.original.quantity)}`
                    : "Custom commission"}
                </span>
              )}
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
        minSize: 150,
        size: 150,
        maxSize: 150,
        cell: ({ row }) => (
          <CommissionTypeBadge type={row.original.type ?? "sale"} />
        ),
      },
      {
        id: "total",
        header: "Total",
        minSize: 120,
        size: 120,
        maxSize: 120,
        cell: ({ row }) => currencyFormatter(row.original.earnings),
      },
      {
        id: "menu",
        enableHiding: false,
        minSize: 48,
        size: 48,
        cell: ({ row }) => <CommissionRowMenu row={row} />,
      },
    ],
    columnPinning: { right: ["menu"] },
    onRowClick: (row, e) => {
      const url = `/${slug}/program/commissions/${row.original.id}`;
      if (e.metaKey || e.ctrlKey) window.open(url, "_blank");
      else router.push(url);
    },
    onRowAuxClick: (row) =>
      window.open(`/${slug}/program/commissions/${row.original.id}`, "_blank"),
    rowProps: (row) => ({
      onPointerEnter: () =>
        router.prefetch(`/${slug}/program/commissions/${row.original.id}`),
    }),
    thClassName: (id) =>
      cn(id === "menu" && "[&>div]:justify-end", "border-l-0"),
    tdClassName: (id) => cn(id === "menu" && "text-right", "border-l-0"),
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-[40px]",
    resourceName: (p) => `commission${p ? "s" : ""}`,
    pagination,
    onPaginationChange: setPagination,
    rowCount: commissionsCount?.all?.count ?? commissions?.length ?? 0,
    loading: isLoading,
    error: error ? "Failed to load commissions" : undefined,
  } as any);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="order-last min-w-0 flex-1 lg:order-first">
        <Table {...commissionsTable} />

        <div className="mt-6">
          <h3 className="mb-4 text-base font-medium text-neutral-900">
            Activity
          </h3>
          <div className="flex flex-col">
            {activityItems.map((item, index) => {
              const badge = PayoutStatusBadges[item.status];

              return (
                <ActivityEvent
                  key={index}
                  icon={badge.icon}
                  timestamp={item.timestamp}
                  isLast={index === activityItems.length - 1}
                >
                  <span className="text-sm text-neutral-700">Payout</span>
                  <StatusBadge variant={badge.variant} icon={null}>
                    {badge.label}
                  </StatusBadge>
                  {item.user && (
                    <>
                      <span className="text-sm text-neutral-500">by</span>
                      <div className="flex h-6 items-center gap-2 rounded-lg bg-neutral-100 px-2 py-1">
                        <img
                          src={
                            item.user.image || `${OG_AVATAR_URL}${item.user.id}`
                          }
                          alt={item.user.name ?? ""}
                          className="size-4 rounded-full"
                        />
                        <span className="text-[13px] text-sm text-neutral-700">
                          {item.user.name}
                        </span>
                      </div>
                    </>
                  )}
                </ActivityEvent>
              );
            })}
          </div>
        </div>
      </div>

      <div className="order-first w-full shrink-0 lg:order-last lg:w-[360px]">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-medium text-neutral-900">
              Invoice details
            </h3>
            <Link
              href={`/${slug}/program/commissions?payoutId=${payout.id}&interval=all`}
              target="_blank"
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "flex h-7 items-center rounded-lg border px-2 text-sm",
              )}
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {Object.entries(invoiceData).map(([key, value]) => (
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

function PayoutDetailsskeleton() {
  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="order-last min-w-0 flex-1 lg:order-first">
        <div className="h-64 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100" />
        <div className="mt-6 h-32 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100" />
      </div>
      <div className="order-first w-full shrink-0 lg:order-last lg:w-[360px]">
        <div className="h-80 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100" />
      </div>
    </div>
  );
}
