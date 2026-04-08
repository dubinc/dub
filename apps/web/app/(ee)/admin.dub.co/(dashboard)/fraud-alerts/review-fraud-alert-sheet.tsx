"use client";

import { PARTNER_PLATFORM_FIELDS } from "@/lib/partners/partner-platforms";
import { PartnerPlatformProps } from "@/lib/types";
import { CommissionSchema } from "@/lib/zod/schemas/commissions";
import { fraudAlertSchema } from "@/lib/zod/schemas/fraud";
import {
  MAX_FRAUD_REASON_LENGTH,
  PartnerSchema,
} from "@/lib/zod/schemas/partners";
import { PayoutSchema } from "@/lib/zod/schemas/payouts";
import {
  ProgramEnrollmentSchema,
  ProgramSchema,
} from "@/lib/zod/schemas/programs";
import { CommissionStatusBadges } from "@/ui/partners/commission-status-badges";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import { FraudAlertStatus } from "@dub/prisma/client";
import {
  Button,
  LoadingSpinner,
  Sheet,
  StatusBadge,
  Table,
  Tooltip,
  useTable,
} from "@dub/ui";
import { BadgeCheck2Fill, Xmark } from "@dub/ui/icons";
import {
  COUNTRIES,
  currencyFormatter,
  formatDateTime,
  formatDateTimeSmart,
  OG_AVATAR_URL,
} from "@dub/utils";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import * as z from "zod/v4";

type FraudAlert = z.infer<typeof fraudAlertSchema>;

type ProgramInfo = Pick<z.infer<typeof ProgramSchema>, "id" | "name" | "logo">;

type PartnerDetail = z.infer<typeof PartnerSchema> & {
  platforms: PartnerPlatformProps[];
  programEnrollments: (Pick<
    z.infer<typeof ProgramEnrollmentSchema>,
    "programId" | "status" | "bannedAt" | "bannedReason"
  > & {
    program: ProgramInfo;
  })[];
  fraudAlerts: FraudAlert[];
  payouts: (z.infer<typeof PayoutSchema> & {
    program: ProgramInfo;
  })[];
  commissions: (Pick<
    z.infer<typeof CommissionSchema>,
    "id" | "earnings" | "currency" | "status" | "createdAt"
  > & {
    program: ProgramInfo;
  })[];
};

const FRAUD_ALERT_STATUS_BADGES: Record<
  FraudAlertStatus,
  { label: string; variant: "pending" | "error" | "neutral" }
> = {
  pending: { label: "Pending", variant: "pending" },
  confirmed: { label: "Confirmed", variant: "error" },
  dismissed: { label: "Dismissed", variant: "neutral" },
};

const BANNED_REASON_LABELS: Record<string, string> = {
  tos_violation: "TOS Violation",
  inappropriate_content: "Inappropriate Content",
  fake_traffic: "Fake Traffic",
  fraud: "Fraud",
  spam: "Spam",
  brand_abuse: "Brand Abuse",
};

export function ReviewFraudAlertSheet({
  alert,
  isOpen,
  setIsOpen,
  onReviewed,
}: {
  alert: FraudAlert | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onReviewed: () => Promise<void>;
}) {
  return (
    <Sheet
      open={isOpen}
      onOpenChange={setIsOpen}
      contentProps={{
        className: "[--sheet-width:720px]",
      }}
    >
      {alert && (
        <SheetContent
          fraudAlert={alert}
          setIsOpen={setIsOpen}
          onReviewed={onReviewed}
        />
      )}
    </Sheet>
  );
}

function SheetContent({
  fraudAlert,
  setIsOpen,
  onReviewed,
}: {
  fraudAlert: FraudAlert;
  setIsOpen: (open: boolean) => void;
  onReviewed: () => Promise<void>;
}) {
  const [reviewNote, setReviewNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: partner, isLoading } = useSWR<PartnerDetail>(
    `/api/admin/partners/${fraudAlert.partner.id}`,
    (url: string) => fetch(url).then((r) => r.json()),
  );

  const handleReview = async (action: "confirmed" | "dismissed") => {
    if (
      !window.confirm(
        `Are you sure you want to ${action.replace("ed", "")} this fraud alert?`,
      )
    ) {
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/fraud-alerts/${fraudAlert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: action,
          reviewNote,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text);
      }

      setReviewNote("");
      setIsOpen(false);
      await onReviewed();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex size-full flex-col">
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-6">
        <Sheet.Title>Review Fraud Alert</Sheet.Title>
        <Sheet.Close asChild>
          <Button
            variant="outline"
            icon={<Xmark className="size-5" />}
            className="h-auto w-fit p-1"
          />
        </Sheet.Close>
      </div>

      {/* Scrollable body */}
      <div className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex flex-col gap-6 p-6">
          {/* Current alert context */}
          <div>
            <div className="flex items-center gap-3">
              <img
                src={
                  fraudAlert.program.logo ||
                  `${OG_AVATAR_URL}${fraudAlert.program.name}`
                }
                alt={fraudAlert.program.name}
                className="size-5 rounded-full"
              />
              <span className="text-sm font-medium">
                {fraudAlert.program.name}
              </span>
              <span className="text-xs text-neutral-400">
                {formatDateTime(fraudAlert.createdAt)}
              </span>
            </div>
            <p className="mt-2 text-sm text-neutral-600">{fraudAlert.reason}</p>
          </div>

          {/* Partner info */}
          <Section title="Partner">
            {isLoading ? (
              <LoadingState />
            ) : partner ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative w-fit">
                    <PartnerAvatar partner={partner} className="size-10" />
                    {partner.country && (
                      <Tooltip content={COUNTRIES[partner.country]}>
                        <div className="absolute -right-1 top-0 overflow-hidden rounded-full bg-neutral-50 p-0.5 transition-transform duration-100 hover:scale-[1.15]">
                          <img
                            alt=""
                            src={`https://flag.vercel.app/m/${partner.country}.svg`}
                            className="size-3 rounded-full"
                          />
                        </div>
                      </Tooltip>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-neutral-900">
                      {fraudAlert.partner.name}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {fraudAlert.partner.email}
                    </span>
                  </div>
                </div>

                <div className="flex gap-x-4 text-xs">
                  <span className="text-neutral-400">Joined</span>
                  <span className="text-neutral-700">
                    {formatDateTimeSmart(partner.createdAt)}
                  </span>
                </div>

                {partner.platforms.length > 0 && (
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {PARTNER_PLATFORM_FIELDS.map(
                      ({ label, icon: Icon, data: getPlatformData }) => {
                        const { value, href, verified } = getPlatformData(
                          partner.platforms,
                        );
                        if (!value) return null;
                        return (
                          <Tooltip
                            key={label}
                            content={
                              <Link
                                href={href ?? "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-neutral-700 hover:text-neutral-900"
                              >
                                <Icon className="size-3 shrink-0" />
                                <span>{value}</span>
                                {verified && (
                                  <BadgeCheck2Fill className="size-3 text-green-600" />
                                )}
                              </Link>
                            }
                          >
                            <Link
                              href={href ?? "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="border-border-subtle hover:bg-bg-muted relative flex size-6 shrink-0 items-center justify-center rounded-full border"
                            >
                              <Icon className="size-3" />
                              <span className="sr-only">{label}</span>
                              {verified && (
                                <BadgeCheck2Fill className="absolute -right-1 -top-1 size-3 text-green-600" />
                              )}
                            </Link>
                          </Tooltip>
                        );
                      },
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </Section>

          {/* Payouts table */}
          <Section title="Payouts">
            {isLoading ? (
              <LoadingState />
            ) : partner ? (
              <PayoutsTable payouts={partner.payouts} />
            ) : null}
          </Section>

          {/* Commissions table */}
          <Section title="Commissions">
            {isLoading ? (
              <LoadingState />
            ) : partner ? (
              <CommissionsTable commissions={partner.commissions} />
            ) : null}
          </Section>

          {/* Ban history table */}
          <Section title="Ban History">
            {isLoading ? (
              <LoadingState />
            ) : partner ? (
              <BanHistoryTable enrollments={partner.programEnrollments} />
            ) : null}
          </Section>

          {/* Previous fraud alerts table */}
          <Section title="Previous Fraud Alerts">
            {isLoading ? (
              <LoadingState />
            ) : partner ? (
              <FraudAlertsTable
                fraudAlerts={partner.fraudAlerts}
                currentAlertId={fraudAlert.id}
              />
            ) : null}
          </Section>
        </div>
      </div>

      {/* Sticky footer with review actions */}
      {fraudAlert.status === "pending" && (
        <div className="shrink-0 border-t border-neutral-200 p-6">
          <div>
            <label className="block text-sm font-medium text-neutral-900">
              Review note{" "}
              <span className="font-normal text-neutral-400">(optional)</span>
            </label>
            <textarea
              className="mt-1.5 block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
              placeholder="Add a note about this review..."
              rows={3}
              maxLength={MAX_FRAUD_REASON_LENGTH}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
            />
            <p className="mt-1 text-right text-xs text-neutral-400">
              {reviewNote.length}/{MAX_FRAUD_REASON_LENGTH}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              className="h-8 w-fit px-3"
              text="Dismiss"
              loading={isSubmitting}
              onClick={() => handleReview("dismissed")}
            />
            <Button
              variant="danger"
              className="h-8 w-fit px-3"
              text="Confirm Fraud"
              loading={isSubmitting}
              onClick={() => handleReview("confirmed")}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PayoutsTable({ payouts }: { payouts: PartnerDetail["payouts"] }) {
  const table = useTable({
    data: payouts,
    columns: [
      {
        id: "program",
        header: "Program",
        cell: ({ row }) => <ProgramCell program={row.original.program} />,
      },
      {
        id: "amount",
        header: "Amount",
        cell: ({ row }) => currencyFormatter(row.original.amount),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const badge =
            PayoutStatusBadges[
              row.original.status as keyof typeof PayoutStatusBadges
            ];
          return (
            <StatusBadge
              variant={
                (badge?.variant as
                  | "pending"
                  | "success"
                  | "error"
                  | "neutral") ?? "neutral"
              }
            >
              {badge?.label ?? row.original.status}
            </StatusBadge>
          );
        },
      },
      {
        id: "createdAt",
        header: "Date",
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
    ],
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-0",
  });

  if (!payouts.length) {
    return <EmptyState message="No payouts" />;
  }

  return <Table {...table} />;
}

function CommissionsTable({
  commissions,
}: {
  commissions: PartnerDetail["commissions"];
}) {
  const table = useTable({
    data: commissions,
    columns: [
      {
        id: "program",
        header: "Program",
        cell: ({ row }) => <ProgramCell program={row.original.program} />,
      },
      {
        id: "earnings",
        header: "Earning",
        cell: ({ row }) => currencyFormatter(row.original.earnings),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const badge =
            CommissionStatusBadges[
              row.original.status as keyof typeof CommissionStatusBadges
            ];
          return (
            <StatusBadge
              variant={
                (badge?.variant as
                  | "pending"
                  | "success"
                  | "error"
                  | "neutral") ?? "neutral"
              }
            >
              {badge?.label ?? row.original.status}
            </StatusBadge>
          );
        },
      },
      {
        id: "createdAt",
        header: "Date",
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
    ],
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-0",
  });

  if (!commissions.length) {
    return <EmptyState message="No commissions" />;
  }

  return <Table {...table} />;
}

function BanHistoryTable({
  enrollments,
}: {
  enrollments: PartnerDetail["programEnrollments"];
}) {
  const table = useTable({
    data: enrollments,
    columns: [
      {
        id: "program",
        header: "Program",
        cell: ({ row }) => <ProgramCell program={row.original.program} />,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge variant="error">{row.original.status}</StatusBadge>
        ),
      },
      {
        id: "bannedAt",
        header: "Banned At",
        cell: ({ row }) =>
          row.original.bannedAt ? formatDateTime(row.original.bannedAt) : "-",
      },
      {
        id: "bannedReason",
        header: "Banned Reason",
        cell: ({ row }) =>
          row.original.bannedReason
            ? BANNED_REASON_LABELS[row.original.bannedReason] ||
              row.original.bannedReason
            : "-",
      },
    ],
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-0",
  });

  if (!enrollments.length) {
    return <EmptyState message="No ban history" />;
  }

  return <Table {...table} />;
}

function FraudAlertsTable({
  fraudAlerts,
  currentAlertId,
}: {
  fraudAlerts: PartnerDetail["fraudAlerts"];
  currentAlertId: string;
}) {
  const filtered = fraudAlerts.filter((fa) => fa.id !== currentAlertId);

  const table = useTable({
    data: filtered,
    columns: [
      {
        id: "program",
        header: "Program",
        cell: ({ row }) => <ProgramCell program={row.original.program} />,
      },
      {
        id: "reason",
        header: "Reason",
        cell: ({ row }) => (
          <Tooltip content={row.original.reason}>
            <span className="line-clamp-1 max-w-[200px] cursor-help truncate">
              {row.original.reason}
            </span>
          </Tooltip>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const badge = FRAUD_ALERT_STATUS_BADGES[row.original.status];
          return (
            <StatusBadge variant={badge.variant}>{badge.label}</StatusBadge>
          );
        },
      },
      {
        id: "reviewedAt",
        header: "Reviewed At",
        cell: ({ row }) =>
          row.original.reviewedAt
            ? formatDateTime(row.original.reviewedAt)
            : "-",
      },
      {
        id: "reviewNote",
        header: "Review Note",
        cell: ({ row }) =>
          row.original.reviewNote ? (
            <Tooltip content={row.original.reviewNote}>
              <span className="line-clamp-1 max-w-[150px] cursor-help truncate">
                {row.original.reviewNote}
              </span>
            </Tooltip>
          ) : (
            "-"
          ),
      },
    ],
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-0",
  });

  if (!filtered.length) {
    return <EmptyState message="No previous fraud alerts" />;
  }

  return <Table {...table} />;
}

function ProgramCell({ program }: { program: ProgramInfo }) {
  return (
    <div className="flex items-center gap-2">
      <img
        src={program.logo || `${OG_AVATAR_URL}${program.name}`}
        alt={program.name}
        className="size-4 rounded-full"
      />
      <span className="truncate text-sm">{program.name}</span>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-neutral-900">{title}</h3>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-24 flex-col items-center justify-center rounded-lg border border-neutral-200">
      <p className="text-sm text-neutral-400">{message}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex h-24 flex-col items-center justify-center rounded-lg border border-neutral-200">
      <LoadingSpinner />
    </div>
  );
}
