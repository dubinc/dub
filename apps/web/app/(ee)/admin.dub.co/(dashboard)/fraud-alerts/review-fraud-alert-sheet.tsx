"use client";

import {
  PartnerProps,
  PayoutResponse,
  ProgramEnrollmentProps,
} from "@/lib/types";
import { fraudAlertSchema } from "@/lib/zod/schemas/fraud";
import { PartnerEarningsSchema } from "@/lib/zod/schemas/partner-profile";
import { MAX_FRAUD_REASON_LENGTH } from "@/lib/zod/schemas/partners";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { FraudAlertStatus } from "@dub/prisma/client";
import { Button, Sheet, StatusBadge } from "@dub/ui";
import { Xmark } from "@dub/ui/icons";
import {
  currencyFormatter,
  formatDateTime,
  nFormatter,
  OG_AVATAR_URL,
} from "@dub/utils";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import * as z from "zod/v4";

type FraudAlert = z.infer<typeof fraudAlertSchema>;

type PartnerDetail = PartnerProps & {
  programEnrollments: ProgramEnrollmentProps[];
  fraudAlerts: FraudAlert[];
  payouts: PayoutResponse[];
  commissions: z.infer<typeof PartnerEarningsSchema>[];
};

const FRAUD_ALERT_STATUS_BADGES: Record<
  FraudAlertStatus,
  { label: string; variant: "pending" | "error" | "neutral" }
> = {
  pending: { label: "Pending", variant: "pending" },
  confirmed: { label: "Confirmed", variant: "error" },
  dismissed: { label: "Dismissed", variant: "neutral" },
};

const PLATFORM_LABELS: Record<string, string> = {
  website: "Website",
  youtube: "YouTube",
  twitter: "Twitter/X",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  tiktok: "TikTok",
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
        className: "[--sheet-width:620px]",
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
          <Section title="Alert Details">
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
          </Section>

          {/* Partner info */}
          <Section title="Partner">
            {isLoading ? (
              <LoadingSkeleton />
            ) : partner ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <PartnerAvatar
                    partner={fraudAlert.partner}
                    className="size-10 bg-white"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-neutral-900">
                      {fraudAlert.partner.name}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {fraudAlert.partner.email}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {partner.country && (
                    <DetailRow label="Country" value={partner.country} />
                  )}
                  {partner.companyName && (
                    <DetailRow label="Company" value={partner.companyName} />
                  )}
                  <DetailRow
                    label="Joined"
                    value={formatDateTime(partner.createdAt)}
                  />
                </div>

                {/* Social handles */}
                {partner.platforms.length > 0 && (
                  <div className="mt-1">
                    <p className="mb-1.5 text-xs font-medium uppercase text-neutral-400">
                      Platforms
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {partner.platforms.map((platform) => (
                        <div
                          key={`${platform.type}-${platform.identifier}`}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-neutral-600">
                            {PLATFORM_LABELS[platform.type] || platform.type}:{" "}
                            <span className="font-medium text-neutral-900">
                              {platform.identifier}
                            </span>
                          </span>
                          {platform.subscribers !== null && (
                            <span className="text-xs text-neutral-400">
                              {nFormatter(platform.subscribers)} subscribers
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </Section>

          {/* Financial stats */}
          <Section title="Financial Summary">
            {isLoading ? (
              <LoadingSkeleton />
            ) : partner ? (
              <FinancialSummary partner={partner} />
            ) : null}
          </Section>

          {/* Ban history */}
          <Section title="Ban History">
            {isLoading ? (
              <LoadingSkeleton />
            ) : partner && partner.programEnrollments.length > 0 ? (
              <div className="flex flex-col gap-2">
                {partner.programEnrollments.map((enrollment) => (
                  <div
                    key={enrollment.programId}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={
                          enrollment.program.logo ||
                          `${OG_AVATAR_URL}${enrollment.program.name}`
                        }
                        alt={enrollment.program.name}
                        className="size-4 rounded-full"
                      />
                      <span className="text-sm font-medium">
                        {enrollment.program.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-neutral-500">
                      {enrollment.bannedReason && (
                        <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-600">
                          {BANNED_REASON_LABELS[enrollment.bannedReason] ||
                            enrollment.bannedReason}
                        </span>
                      )}
                      {enrollment.bannedAt && (
                        <span>{formatDateTime(enrollment.bannedAt)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400">No ban history</p>
            )}
          </Section>

          {/* Previous fraud alerts */}
          <Section title="Previous Fraud Alerts">
            {isLoading ? (
              <LoadingSkeleton />
            ) : partner && partner.fraudAlerts.length > 0 ? (
              <div className="flex flex-col gap-2">
                {partner.fraudAlerts.map((fa) => {
                  const badge = FRAUD_ALERT_STATUS_BADGES[fa.status];
                  return (
                    <div
                      key={fa.id}
                      className="rounded-lg border border-neutral-200 px-3 py-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img
                            src={
                              fa.program.logo ||
                              `${OG_AVATAR_URL}${fa.program.name}`
                            }
                            alt={fa.program.name}
                            className="size-4 rounded-full"
                          />
                          <span className="text-sm font-medium">
                            {fa.program.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge variant={badge.variant}>
                            {badge.label}
                          </StatusBadge>
                          <span className="text-xs text-neutral-400">
                            {formatDateTime(fa.createdAt)}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-neutral-500">
                        {fa.reason}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-neutral-400">No previous alerts</p>
            )}
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

function FinancialSummary({ partner }: { partner: PartnerDetail }) {
  const totalPayoutAmount = partner.payouts.reduce(
    (sum, p) => sum + p.amount,
    0,
  );
  const totalCommissionEarnings = partner.commissions.reduce(
    (sum, c) => sum + c.earnings,
    0,
  );
  const fraudCommissions = partner.commissions.filter(
    (c) => c.status === "fraud",
  ).length;

  // Group payouts by status
  const payoutsByStatus = partner.payouts.reduce(
    (acc, p) => {
      if (!acc[p.status]) {
        acc[p.status] = { amount: 0, count: 0 };
      }
      acc[p.status].amount += p.amount;
      acc[p.status].count += 1;
      return acc;
    },
    {} as Record<string, { amount: number; count: number }>,
  );

  // Group commissions by status
  const commissionsByStatus = partner.commissions.reduce(
    (acc, c) => {
      if (!acc[c.status]) {
        acc[c.status] = { earnings: 0, count: 0 };
      }
      acc[c.status].earnings += c.earnings;
      acc[c.status].count += 1;
      return acc;
    },
    {} as Record<string, { earnings: number; count: number }>,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Total Payouts"
          value={currencyFormatter(totalPayoutAmount)}
          sub={`${partner.payouts.length} payouts`}
        />
        <StatCard
          label="Total Commissions"
          value={currencyFormatter(totalCommissionEarnings)}
          sub={`${partner.commissions.length} commissions`}
        />
        <StatCard
          label="Fraud Commissions"
          value={String(fraudCommissions)}
          sub="flagged as fraud"
          highlight={fraudCommissions > 0}
        />
      </div>

      {/* Payout breakdown by status */}
      {partner.payouts.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase text-neutral-400">
            Payouts by Status
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(payoutsByStatus).map(
              ([status, { amount, count }]) => (
                <span
                  key={status}
                  className="rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-600"
                >
                  {status}: {currencyFormatter(amount)} ({count})
                </span>
              ),
            )}
          </div>
        </div>
      )}

      {/* Commission breakdown by status */}
      {partner.commissions.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase text-neutral-400">
            Commissions by Status
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(commissionsByStatus).map(
              ([status, { earnings, count }]) => (
                <span
                  key={status}
                  className="rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-600"
                >
                  {status}: {currencyFormatter(earnings)} ({count})
                </span>
              ),
            )}
          </div>
        </div>
      )}
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
    <div className="border-b border-neutral-200 pb-6 last:border-0">
      <h3 className="mb-3 text-sm font-semibold text-neutral-900">{title}</h3>
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-neutral-400">{label}</span>
      <span className="text-neutral-700">{value}</span>
    </>
  );
}

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 p-3">
      <p className="text-xs text-neutral-400">{label}</p>
      <p
        className={`mt-0.5 text-lg font-semibold ${highlight ? "text-red-600" : "text-neutral-900"}`}
      >
        {value}
      </p>
      <p className="text-xs text-neutral-400">{sub}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-100" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-neutral-100" />
    </div>
  );
}
