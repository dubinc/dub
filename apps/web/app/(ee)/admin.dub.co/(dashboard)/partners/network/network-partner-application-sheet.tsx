"use client";

import { AdminNetworkPartner } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { CountryCombobox } from "@/ui/partners/country-combobox";
import { PartnerAbout } from "@/ui/partners/partner-about";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { PartnerInfoCards } from "@/ui/partners/partner-info-cards";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { CountryFlag } from "@/ui/shared/country-flag";
import { X } from "@/ui/shared/icons";
import { ProgramEnrollmentStatus } from "@dub/prisma/client";
import {
  Button,
  ChevronLeft,
  ChevronRight,
  ScrollContainer,
  Sheet,
  StatusBadge,
  Trophy,
  useKeyboardShortcut,
  User,
  useRouterStuff,
  Users,
} from "@dub/ui";
import { cn, COUNTRIES, currencyFormatter, OG_AVATAR_URL } from "@dub/utils";
import { LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { NetworkPartnerChangeHistory } from "./network-partner-change-history";

type NetworkPartnerSheetTabId = "about" | "programs" | "duplicates";

function isDirectDraftToApprovedNetworkApproval(
  partner: AdminNetworkPartner,
): boolean {
  if (partner.networkStatus !== "approved") {
    return false;
  }

  const networkLogs = (partner.changeHistoryLog ?? []).filter(
    (entry) => entry.field === "networkStatus",
  );

  return (
    networkLogs.length === 1 &&
    networkLogs[0].from === "draft" &&
    networkLogs[0].to === "approved"
  );
}

export function NetworkPartnerApplicationSheet({
  isOpen,
  setIsOpen,
  partner,
  onPrevious,
  onNext,
  onReview,
  onUpdateCountry,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  partner: AdminNetworkPartner;
  onPrevious?: () => void;
  onNext?: () => void;
  onReview: (
    partner: AdminNetworkPartner,
    status: "approved" | "rejected" | "draft",
  ) => Promise<void>;
  onUpdateCountry: (
    partner: AdminNetworkPartner,
    country: string,
  ) => Promise<void>;
}) {
  const [currentTabId, setCurrentTabId] =
    useState<NetworkPartnerSheetTabId>("about");
  const [selectedCountry, setSelectedCountry] = useState(partner.country ?? "");
  const [isUpdatingCountry, setIsUpdatingCountry] = useState(false);
  const { queryParams } = useRouterStuff();

  const showRevertToDraftInsteadOfReject =
    isDirectDraftToApprovedNetworkApproval(partner);
  const isCountryChanged =
    selectedCountry.length > 0 && selectedCountry !== partner.country;

  useEffect(() => {
    setSelectedCountry(partner.country ?? "");
  }, [partner.country, partner.id]);

  const handleUpdateCountry = async () => {
    if (!isCountryChanged || isUpdatingCountry) {
      return;
    }

    setIsUpdatingCountry(true);
    try {
      await onUpdateCountry(partner, selectedCountry);
    } finally {
      setIsUpdatingCountry(false);
    }
  };

  const PartnerDetails = (
    <div className="rounded-lg border border-neutral-200 bg-neutral-100 p-3">
      <div className="flex items-center gap-4">
        <PartnerAvatar partner={partner} className="size-10 bg-white" />
        <div className="flex min-w-0 flex-col">
          <h4 className="truncate text-sm font-medium text-neutral-900">
            {partner.name}
          </h4>
          <p className="truncate text-xs text-neutral-500">{partner.email}</p>
        </div>
      </div>
    </div>
  );

  const {
    setShowConfirmModal: setShowApproveConfirm,
    confirmModal: approveModal,
  } = useConfirmModal({
    title: "Approve network profile",
    description: PartnerDetails,
    confirmText: "Approve",
    onConfirm: async () => {
      await onReview(partner, "approved");
    },
    confirmShortcut: "a",
    confirmShortcutOptions: { sheet: true, modal: true },
  });

  const {
    setShowConfirmModal: setShowRejectConfirm,
    confirmModal: rejectModal,
  } = useConfirmModal({
    title: "Reject network profile",
    description: PartnerDetails,
    confirmText: "Reject",
    confirmVariant: "danger",
    onConfirm: async () => {
      await onReview(partner, "rejected");
    },
    confirmShortcut: "r",
    confirmShortcutOptions: { sheet: true, modal: true },
  });

  const {
    setShowConfirmModal: setShowRevertToDraftConfirm,
    confirmModal: revertToDraftModal,
  } = useConfirmModal({
    title: "Revert network profile to draft",
    description: PartnerDetails,
    confirmText: "Revert to draft",
    confirmVariant: "danger",
    onConfirm: async () => {
      await onReview(partner, "draft");
    },
    confirmShortcut: "r",
    confirmShortcutOptions: { sheet: true, modal: true },
  });

  const {
    setShowConfirmModal: setShowUpdateCountryConfirm,
    confirmModal: updateCountryModal,
  } = useConfirmModal({
    title: "Update partner country",
    description: (
      <div className="space-y-2">
        <p className="text-sm text-neutral-600">
          Change country from{" "}
          <span className="font-medium text-neutral-900">
            {partner.country ? COUNTRIES[partner.country] : "Unknown"}
          </span>{" "}
          to{" "}
          <span className="font-medium text-neutral-900">
            {selectedCountry ? COUNTRIES[selectedCountry] : "Unknown"}
          </span>
          ?
        </p>
        <p className="text-xs text-neutral-500">
          This will reset the connected Stripe account and payout settings.
        </p>
      </div>
    ),
    confirmText: "Update country",
    onConfirm: async () => {
      await handleUpdateCountry();
    },
  });

  useKeyboardShortcut(
    "ArrowRight",
    () => {
      if (onNext) {
        onNext();
      }
    },
    { sheet: true },
  );

  useKeyboardShortcut(
    "ArrowLeft",
    () => {
      if (onPrevious) {
        onPrevious();
      }
    },
    { sheet: true },
  );

  useKeyboardShortcut("a", () => setShowApproveConfirm(true), {
    sheet: true,
    enabled: !["approved", "trusted"].includes(partner.networkStatus),
  });

  useKeyboardShortcut("r", () => setShowRejectConfirm(true), {
    sheet: true,
    enabled:
      !showRevertToDraftInsteadOfReject &&
      !["rejected", "trusted"].includes(partner.networkStatus),
  });

  useKeyboardShortcut("r", () => setShowRevertToDraftConfirm(true), {
    sheet: true,
    enabled: showRevertToDraftInsteadOfReject,
  });

  return (
    <Sheet
      open={isOpen}
      onOpenChange={setIsOpen}
      onClose={() => queryParams({ del: "partnerId", scroll: false })}
      contentProps={{
        className: "md:w-[max(min(calc(100vw-334px),1170px),540px)]",
      }}
    >
      {approveModal}
      {rejectModal}
      {revertToDraftModal}
      {updateCountryModal}

      <div className="flex size-full flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">
            Network profile
          </Sheet.Title>
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <Button
                type="button"
                disabled={!onPrevious}
                onClick={onPrevious}
                variant="secondary"
                className="size-9 rounded-l-lg rounded-r-none p-0"
                icon={<ChevronLeft className="size-3.5" />}
              />
              <Button
                type="button"
                disabled={!onNext}
                onClick={onNext}
                variant="secondary"
                className="-ml-px size-9 rounded-l-none rounded-r-lg p-0"
                icon={<ChevronRight className="size-3.5" />}
              />
            </div>
            <Sheet.Close asChild>
              <Button
                variant="outline"
                icon={<X className="size-5" />}
                className="h-auto w-fit p-1"
              />
            </Sheet.Close>
          </div>
        </div>

        <div className="@3xl/sheet:grid-cols-[minmax(440px,1fr)_minmax(0,360px)] scrollbar-hide grid min-h-0 grow grid-cols-1 gap-x-6 gap-y-4 overflow-y-auto p-4 sm:p-6">
          <div className="@3xl/sheet:order-2 @3xl/sheet:sticky @3xl/sheet:top-0 @3xl/sheet:self-start space-y-4">
            <PartnerInfoCards
              type="admin"
              partner={partner}
              showApplicationRiskAnalysis
            />
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <h3 className="text-sm font-medium text-neutral-900">Country</h3>
              <p className="mt-1 text-xs text-neutral-500">
                Updating country clears connected Stripe account and may trigger
                reverification.
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
                <div className="min-w-0 grow">
                  <CountryCombobox
                    value={selectedCountry}
                    onChange={setSelectedCountry}
                  />
                </div>
                <Button
                  type="button"
                  text="Update"
                  className="w-full shrink-0 sm:mt-1.5 sm:w-fit"
                  loading={isUpdatingCountry}
                  onClick={() => setShowUpdateCountryConfirm(true)}
                  disabled={!isCountryChanged || isUpdatingCountry}
                />
              </div>
            </div>
            <div className="@3xl/sheet:max-h-[50dvh] @3xl/sheet:overflow-y-auto @3xl/sheet:pr-1 overflow-x-hidden">
              <NetworkPartnerChangeHistory
                changeHistoryLog={partner.changeHistoryLog}
              />
            </div>
          </div>
          <div className="@3xl/sheet:order-1">
            <div className="border-border-subtle overflow-hidden rounded-xl border bg-neutral-100">
              <NetworkPartnerSheetTabs
                currentTabId={currentTabId}
                setCurrentTabId={setCurrentTabId}
                programsCount={partner.programs.length}
                duplicatesCount={partner.duplicatePartnerAccounts.length}
              />
              <div className="border-border-subtle -mx-px -mb-px rounded-xl border bg-white p-4">
                {currentTabId === "about" && (
                  <div className="grid grid-cols-1 gap-5 text-sm text-neutral-600">
                    <PartnerAbout partner={partner} />
                  </div>
                )}
                {currentTabId === "programs" && (
                  <ScrollContainer className="@3xl/sheet:max-h-[72dvh]">
                    <NetworkPartnerProgramPerformance partner={partner} />
                  </ScrollContainer>
                )}
                {currentTabId === "duplicates" &&
                  partner.duplicatePartnerAccounts.length > 0 && (
                    <ScrollContainer className="@3xl/sheet:max-h-[72dvh]">
                      <NetworkPartnerDuplicateAccounts
                        duplicatePartnerAccounts={
                          partner.duplicatePartnerAccounts
                        }
                      />
                    </ScrollContainer>
                  )}
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-neutral-200 p-5">
          <div className="flex justify-end gap-2">
            {showRevertToDraftInsteadOfReject ? (
              <Button
                type="button"
                variant="secondary"
                text="Revert to draft"
                className="w-fit shrink-0"
                shortcut="R"
                onClick={() => setShowRevertToDraftConfirm(true)}
              />
            ) : (
              <Button
                type="button"
                variant="secondary"
                text="Reject"
                className="w-fit shrink-0"
                shortcut="R"
                onClick={() => setShowRejectConfirm(true)}
                disabledTooltip={
                  ["rejected", "trusted"].includes(partner.networkStatus)
                    ? `Cannot reject a ${partner.networkStatus} partner.`
                    : undefined
                }
              />
            )}
            <Button
              type="button"
              variant="primary"
              text="Approve"
              className="w-fit shrink-0"
              shortcut="A"
              onClick={() => setShowApproveConfirm(true)}
              disabledTooltip={
                ["approved", "trusted"].includes(partner.networkStatus)
                  ? `Cannot approve a ${partner.networkStatus} partner.`
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    </Sheet>
  );
}

function NetworkPartnerSheetTabs({
  currentTabId,
  setCurrentTabId,
  programsCount,
  duplicatesCount,
}: {
  currentTabId: NetworkPartnerSheetTabId;
  setCurrentTabId: (tabId: NetworkPartnerSheetTabId) => void;
  programsCount: number;
  duplicatesCount: number;
}) {
  const layoutGroupId = useId();

  const tabs: {
    id: NetworkPartnerSheetTabId;
    label: string;
    icon: typeof User;
    badge?: string | number;
    badgeClassName?: string;
  }[] = [
    {
      id: "about",
      label: "About",
      icon: User,
    },
    {
      id: "programs",
      label: "Programs",
      icon: Trophy,
      badge:
        programsCount === 0
          ? undefined
          : programsCount > 99
            ? "99+"
            : programsCount,
    },
    ...(duplicatesCount > 0
      ? [
          {
            id: "duplicates" as const,
            label: "Duplicates",
            icon: Users,
            badge: duplicatesCount > 99 ? "99+" : duplicatesCount,
            badgeClassName: "bg-red-600 text-white",
          },
        ]
      : []),
  ];

  return (
    <div className="scrollbar-hide relative z-0 flex items-center gap-1 overflow-x-auto p-2">
      <LayoutGroup id={layoutGroupId}>
        <div className="relative z-0 inline-flex items-center gap-1">
          {tabs.map(({ id, label, icon: Icon, badge, badgeClassName }) => {
            const isSelected = id === currentTabId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setCurrentTabId(id)}
                data-selected={isSelected}
                className={cn(
                  "text-content-emphasis relative z-10 flex items-center gap-2 px-2.5 py-1 text-sm font-medium",
                  !isSelected &&
                    "hover:text-content-subtle z-[11] transition-colors",
                )}
              >
                <Icon className="size-4" />
                <span>{label}</span>
                {badge && (
                  <span
                    className={cn(
                      "rounded-md bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white",
                      badgeClassName,
                    )}
                  >
                    {badge}
                  </span>
                )}
                {isSelected && (
                  <motion.div
                    layoutId={layoutGroupId}
                    className="border-border-subtle bg-bg-default absolute left-0 top-0 -z-[1] size-full rounded-lg border shadow-sm"
                    transition={{ duration: 0.25 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </LayoutGroup>
    </div>
  );
}

function NetworkPartnerDuplicateAccounts({
  duplicatePartnerAccounts,
}: {
  duplicatePartnerAccounts: AdminNetworkPartner["duplicatePartnerAccounts"];
}) {
  return (
    <div>
      <h3 className="text-content-emphasis text-sm font-semibold">
        Duplicate partner accounts
      </h3>
      <p className="mt-1 text-sm text-neutral-500">
        These accounts likely match this applicant by email or profile details.
      </p>

      <div className="mt-4 space-y-3">
        {duplicatePartnerAccounts.map((account) => (
          <Link
            key={account.id}
            href={`/partners/network?partnerId=${account.id}&search=${encodeURIComponent(account.email ?? "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-lg border border-red-100 bg-red-50/40 p-3 transition-colors hover:border-red-200 hover:bg-red-50"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <PartnerAvatar partner={account} className="size-9 bg-white" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900 group-hover:underline">
                    {account.name}
                  </p>
                  <p className="truncate text-xs text-neutral-600">
                    {account.email || "No email"}
                  </p>
                </div>
              </div>
              <div className="flex w-fit items-center gap-1.5 rounded-md border border-red-200 bg-white px-2.5 py-1">
                {account.country && (
                  <CountryFlag
                    countryCode={account.country}
                    className="size-3.5"
                  />
                )}
                <p className="truncate text-sm font-medium text-neutral-900 group-hover:underline">
                  {account.country ? COUNTRIES[account.country] : "Unknown"}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function NetworkPartnerProgramPerformance({
  partner,
}: {
  partner: AdminNetworkPartner;
}) {
  const [selectedStatus, setSelectedStatus] = useState<
    ProgramEnrollmentStatus | "all"
  >("all");

  const statusOrder = [
    "approved",
    "invited",
    "pending",
    "rejected",
    "deactivated",
    "banned",
  ] as const;

  const statusCounts = partner.programs.reduce(
    (counts, program) => {
      counts[program.status] = (counts[program.status] ?? 0) + 1;
      return counts;
    },
    {} as Partial<Record<ProgramEnrollmentStatus, number>>,
  );

  const statusSummary = statusOrder
    .map((status) => ({
      status,
      count: statusCounts[status] ?? 0,
    }))
    .filter(({ count }) => count > 0);

  const filteredPrograms =
    selectedStatus === "all"
      ? partner.programs
      : partner.programs.filter((program) => program.status === selectedStatus);

  return (
    <div>
      <div
        className={cn(
          "flex justify-between",
          statusSummary.length > 3
            ? "flex-col items-start"
            : "flex-row items-center",
        )}
      >
        <h3 className="text-content-emphasis text-sm font-semibold">
          Program performance
        </h3>
        {statusSummary.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={cn(
                "rounded-md transition-opacity",
                selectedStatus === "all"
                  ? "opacity-100"
                  : "opacity-60 hover:opacity-100",
              )}
              onClick={() => setSelectedStatus("all")}
            >
              <StatusBadge variant="neutral">
                All ({partner.programs.length})
              </StatusBadge>
            </button>
            {statusSummary.map(({ status, count }) => (
              <button
                key={status}
                type="button"
                className={cn(
                  "rounded-md transition-opacity",
                  selectedStatus === status
                    ? "opacity-100"
                    : "opacity-60 hover:opacity-100",
                )}
                onClick={() =>
                  setSelectedStatus((current) =>
                    current === status ? "all" : status,
                  )
                }
              >
                <StatusBadge {...PartnerStatusBadges[status]}>
                  {PartnerStatusBadges[status].label} ({count})
                </StatusBadge>
              </button>
            ))}
          </div>
        )}
      </div>
      {partner.programs.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">
          This partner is not enrolled in any programs yet.
        </p>
      ) : (
        <div
          className={cn(
            "space-y-3",
            statusSummary.length > 0 ? "mt-4" : "mt-3",
          )}
        >
          {filteredPrograms.map((program) => (
            <div
              key={`${partner.id}-${program.id}`}
              className="rounded-lg border border-neutral-200 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <Link
                  href={program.url || "#"}
                  target="_blank"
                  className="group flex min-w-0 items-center gap-2"
                >
                  <img
                    src={program.logo || `${OG_AVATAR_URL}${program.name}`}
                    alt={program.name}
                    className="size-5 rounded-full"
                  />
                  <span className="truncate text-sm font-medium text-neutral-900 group-hover:underline">
                    {program.name}
                  </span>
                </Link>
                <StatusBadge {...PartnerStatusBadges[program.status]}>
                  {PartnerStatusBadges[program.status].label}
                </StatusBadge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-neutral-500">
                <div>
                  <p className="text-neutral-400">Total revenue</p>
                  <p className="mt-0.5 text-sm font-medium text-neutral-900">
                    {currencyFormatter(program.totalSaleAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-400">Total commissions</p>
                  <p className="mt-0.5 text-sm font-medium text-neutral-900">
                    {currencyFormatter(program.totalCommissions)}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {filteredPrograms.length === 0 && (
            <p className="text-sm text-neutral-500">
              No programs match this status.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
