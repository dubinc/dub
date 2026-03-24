"use client";

import { useCommission } from "@/lib/swr/use-commission";
import useGroups from "@/lib/swr/use-groups";
import useWorkspace from "@/lib/swr/use-workspace";
import { CommissionDetail, CommissionResponse } from "@/lib/types";
import { CustomerAvatar } from "@/ui/customers/customer-avatar";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ActivityEvent } from "@/ui/partners/activity-event";
import { CommissionTypeIcon } from "@/ui/partners/comission-type-icon";
import { CommissionRowMenu } from "@/ui/partners/commission-row-menu";
import { CommissionStatusBadges } from "@/ui/partners/commission-status-badges";
import { CommissionTypeBadge } from "@/ui/partners/commission-type-badge";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { CommentCardDisplay } from "@/ui/partners/partner-comments";
import { ConditionalLink } from "@/ui/shared/conditional-link";
import { UserAvatar } from "@/ui/users/user-avatar";
import {
  ChevronRight,
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
  pluralize,
} from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { addDays } from "date-fns";
import Link from "next/link";
import { redirect } from "next/navigation";

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
                  <PartnerAvatar
                    partner={commission.partner}
                    className="size-5 shrink-0"
                  />
                )}
                <span className="text-lg font-semibold leading-7 text-neutral-900">
                  {commission?.partner.name}
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
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-sm font-medium text-neutral-700">
              Failed to load commission
            </p>
            <p className="text-sm text-neutral-500">{error.message}</p>
          </div>
        ) : null}
      </PageWidthWrapper>
    </PageContent>
  );
}

function CommissionDetailsContent({
  commission,
  slug,
}: {
  commission: CommissionDetail;
  slug: string;
}) {
  const { groups } = useGroups();
  const group = groups?.find((g) => g.id === commission.partner.groupId);

  const statusBadge = CommissionStatusBadges[commission.status];

  const itemsTable = useTable<CommissionDetail>({
    data: [commission],
    columns: [
      {
        id: "item",
        header: "Item",
        minSize: 260,
        size: 280,
        cell: ({ row }) => {
          const customer = row.original.customer;
          const customerHref = customer
            ? `/${slug}/program/customers/${customer.id}`
            : undefined;

          return (
            <div className="flex items-center gap-2">
              {["click", "custom"].includes(row.original.type!) ? (
                <div className="flex size-6 items-center justify-center rounded-full bg-neutral-100">
                  <CommissionTypeIcon
                    type={row.original.type}
                    className="size-4"
                  />
                </div>
              ) : (
                customer && (
                  <CustomerAvatar customer={customer} className="size-6" />
                )
              )}

              <div className="flex flex-col">
                {customerHref ? (
                  <Link
                    href={customerHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 max-w-[13rem] cursor-alias truncate text-xs font-medium text-neutral-700 decoration-dotted hover:underline"
                  >
                    {customer?.email || customer?.name}
                  </Link>
                ) : (
                  <span className="min-w-0 max-w-[13rem] truncate text-xs font-medium text-neutral-700">
                    {row.original.type === "click"
                      ? `${row.original.quantity} ${pluralize("click", row.original.quantity)}`
                      : customer
                        ? customer.email || customer.name
                        : "Custom commission"}
                  </span>
                )}
                <span className="text-xs text-neutral-500">
                  {formatDateTime(row.original.createdAt)}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        id: "type",
        header: "Type",
        minSize: 100,
        size: 110,
        maxSize: 130,
        cell: ({ row }) => (
          <CommissionTypeBadge type={row.original.type ?? "sale"} />
        ),
      },
      {
        id: "total",
        header: "Total",
        minSize: 90,
        size: 110,
        maxSize: 130,
        cell: ({ row }) => currencyFormatter(row.original.earnings),
      },
      {
        id: "menu",
        enableHiding: false,
        minSize: 48,
        size: 48,
        cell: ({ row }) => (
          <CommissionRowMenu row={row as unknown as Row<CommissionResponse>} />
        ),
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
  });

  const detailRows: Record<string, React.ReactNode> = {
    Partner: (
      <Link
        href={`/${slug}/program/partners/${commission.partner.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-w-0 cursor-alias items-center gap-1.5 text-neutral-500 decoration-dotted hover:text-neutral-950 hover:underline"
      >
        <PartnerAvatar
          partner={commission.partner}
          className="size-4 shrink-0"
        />
        <span className="truncate">{commission.partner.name}</span>
      </Link>
    ),

    ...(group && {
      Group: (
        <Link
          href={`/${slug}/program/groups/${group.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex cursor-alias items-center gap-1.5 text-neutral-800 decoration-dotted hover:underline"
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

    ...(commission.payout?.id && {
      Payout: (
        <ConditionalLink
          href={`/${slug}/program/payouts/${commission.payout.id}`}
          className="font-mono text-xs"
          title={commission.payout.id}
        >
          {commission.payout.id}
        </ConditionalLink>
      ),
    }),
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="order-last min-w-0 flex-1 lg:order-first">
        <Table {...itemsTable} />

        <CommissionActivity commission={commission} slug={slug} />
      </div>

      <div className="order-first w-full shrink-0 lg:order-last lg:w-[360px]">
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <h3 className="text-content-emphasis mb-2 text-base font-semibold">
            Commission details
          </h3>
          <div className="flex flex-col gap-1">
            {Object.entries(detailRows).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center gap-4 rounded-md py-1"
              >
                <div className="w-20 shrink-0 text-xs font-medium text-neutral-700">
                  {key}
                </div>
                <div className="flex min-w-0 flex-1 items-center text-xs font-medium text-neutral-500">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CommissionActivity({
  commission,
  slug,
}: {
  commission: CommissionDetail;
  slug: string;
}) {
  return (
    <div className="mt-6">
      <h3 className="mb-4 text-base font-medium text-neutral-900">Activity</h3>
      <div className="flex flex-col">
        {[
          // Paid event
          ...(commission.status === "paid" && commission.payout?.id
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
                      {commission.payout.user && (
                        <>
                          <span className="text-sm text-neutral-500">by</span>
                          <div className="flex h-6 items-center gap-2 rounded-lg bg-neutral-100 px-2 py-1">
                            <UserAvatar
                              user={commission.payout.user}
                              className="size-4"
                            />
                            <span className="text-[13px] text-neutral-700">
                              {commission.payout.user.name}
                            </span>
                          </div>
                        </>
                      )}
                      <Link
                        href={`/${slug}/program/payouts/${commission.payout.id}`}
                        className="flex h-6 cursor-pointer items-center gap-2 rounded-lg bg-neutral-100 px-2 py-1 transition-colors hover:bg-neutral-200"
                      >
                        <InvoiceDollar className="size-4 shrink-0 text-neutral-500" />
                        <span className="font-mono text-[13px] text-neutral-700">
                          {commission.payout.id}
                        </span>
                      </Link>
                    </>
                  ),
                },
              ]
            : []),

          // Processed event
          ...(["paid", "processed"].includes(commission.status)
            ? [
                {
                  icon: CommissionStatusBadges["processed"].icon,
                  timestamp: addDays(
                    commission.createdAt,
                    commission.holdingPeriodDays ?? 0,
                  ),
                  children: (
                    <>
                      <span className="text-sm text-neutral-700">
                        Commission
                      </span>
                      <StatusBadge
                        icon={null}
                        variant={CommissionStatusBadges["processed"].variant}
                      >
                        {CommissionStatusBadges["processed"].label}
                      </StatusBadge>
                      {commission.holdingPeriodDays ? (
                        <span className="text-sm text-neutral-700">
                          after {commission.holdingPeriodDays}-day{" "}
                          <a
                            href="https://dub.co/help/article/partner-payouts#payout-holding-period"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cursor-help underline decoration-dotted underline-offset-2"
                          >
                            holding period
                          </a>
                        </span>
                      ) : null}
                    </>
                  ),
                },
              ]
            : []),

          ...(["canceled", "duplicate", "fraud", "refunded"].includes(
            commission.status,
          )
            ? [
                {
                  icon: CommissionStatusBadges[commission.status].icon,
                  timestamp: commission.updatedAt,
                  children: (
                    <>
                      <span className="text-sm text-neutral-700">
                        Commission marked as
                      </span>
                      <StatusBadge
                        icon={null}
                        variant={
                          CommissionStatusBadges[commission.status].variant
                        }
                      >
                        {CommissionStatusBadges[commission.status].label}
                      </StatusBadge>
                    </>
                  ),
                },
              ]
            : []),

          // Pending / created event
          {
            icon: CommissionStatusBadges["pending"].icon,
            timestamp: commission.createdAt,
            note: (() => {
              const text = commission.reward
                ? `Earn ${
                    commission.reward.type === "percentage"
                      ? `${commission.reward.amountInPercentage ?? 0}%`
                      : currencyFormatter(
                          commission.reward.amountInCents ?? 0,
                          { trailingZeroDisplay: "stripIfInteger" },
                        )
                  } per ${commission.reward.event}`
                : commission.description ?? null;

              if (!text) return undefined;

              return (
                <CommentCardDisplay
                  user={commission.user}
                  timestamp={commission.createdAt}
                  text={text}
                />
              );
            })(),
            children: (
              <>
                <span className="text-sm text-neutral-700">Commission</span>
                <StatusBadge
                  icon={null}
                  variant={CommissionStatusBadges["pending"].variant}
                >
                  {CommissionStatusBadges["pending"].label}
                </StatusBadge>
                {commission.user ? (
                  <>
                    <span className="text-sm text-neutral-500">by</span>
                    <div className="flex h-6 items-center gap-2 rounded-lg bg-neutral-100 px-2 py-1">
                      <UserAvatar user={commission.user} className="size-4" />
                      <span className="text-[13px] text-neutral-700">
                        {commission.user.name}
                      </span>
                    </div>
                  </>
                ) : null}
              </>
            ),
          },
        ].map((event, index, arr) => (
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
