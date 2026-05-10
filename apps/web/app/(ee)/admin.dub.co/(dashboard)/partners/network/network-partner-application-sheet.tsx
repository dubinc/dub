"use client";

import { AdminNetworkPartner } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { PartnerAbout } from "@/ui/partners/partner-about";
import { PartnerInfoCards } from "@/ui/partners/partner-info-cards";
import { X } from "@/ui/shared/icons";
import {
  Button,
  ChevronLeft,
  ChevronRight,
  Sheet,
  StatusBadge,
  Trophy,
  useKeyboardShortcut,
  User,
} from "@dub/ui";
import { capitalize, cn, currencyFormatter, OG_AVATAR_URL } from "@dub/utils";
import { LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { useId, useState } from "react";

export function NetworkPartnerApplicationSheet({
  isOpen,
  setIsOpen,
  partner,
  onPrevious,
  onNext,
  onReview,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  partner: AdminNetworkPartner;
  onPrevious?: () => void;
  onNext?: () => void;
  onReview: (
    partner: AdminNetworkPartner,
    status: "approved" | "rejected",
  ) => Promise<void>;
}) {
  const [currentTabId, setCurrentTabId] = useState<"about" | "programs">(
    "about",
  );

  const {
    setShowConfirmModal: setShowApproveConfirm,
    confirmModal: approveModal,
  } = useConfirmModal({
    title: "Approve network application",
    description: `Approve ${partner.name} for the Dub Partner Network?`,
    confirmText: "Approve",
    onConfirm: async () => {
      await onReview(partner, "approved");
    },
  });

  const {
    setShowConfirmModal: setShowRejectConfirm,
    confirmModal: rejectModal,
  } = useConfirmModal({
    title: "Reject network application",
    description: `Reject ${partner.name}'s network application?`,
    confirmText: "Reject",
    confirmVariant: "danger",
    onConfirm: async () => {
      await onReview(partner, "rejected");
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

  return (
    <Sheet
      open={isOpen}
      onOpenChange={setIsOpen}
      contentProps={{
        className: "md:w-[max(min(calc(100vw-334px),1170px),540px)]",
      }}
    >
      {approveModal}
      {rejectModal}

      <div className="flex size-full flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">
            Network application
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
          <div className="@3xl/sheet:order-2">
            <PartnerInfoCards
              type="admin"
              partner={partner}
              showApplicationRiskAnalysis
            />
          </div>
          <div className="@3xl/sheet:order-1">
            <div className="border-border-subtle overflow-hidden rounded-xl border bg-neutral-100">
              <NetworkPartnerSheetTabs
                currentTabId={currentTabId}
                setCurrentTabId={setCurrentTabId}
              />
              <div className="border-border-subtle -mx-px -mb-px rounded-xl border bg-white p-4">
                {currentTabId === "about" && (
                  <div className="grid grid-cols-1 gap-5 text-sm text-neutral-600">
                    <PartnerAbout partner={partner} />
                  </div>
                )}
                {currentTabId === "programs" && (
                  <NetworkPartnerProgramPerformance partner={partner} />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-neutral-200 p-5">
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              text="Reject"
              className="w-fit shrink-0"
              onClick={() => setShowRejectConfirm(true)}
            />
            <Button
              type="button"
              variant="primary"
              text="Approve"
              className="w-fit shrink-0"
              onClick={() => setShowApproveConfirm(true)}
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
}: {
  currentTabId: "about" | "programs";
  setCurrentTabId: (tabId: "about" | "programs") => void;
}) {
  const layoutGroupId = useId();

  const tabs = [
    {
      id: "about" as const,
      label: "About",
      icon: User,
    },
    {
      id: "programs" as const,
      label: "Programs",
      icon: Trophy,
    },
  ];

  return (
    <div className="scrollbar-hide relative z-0 flex items-center gap-1 overflow-x-auto p-2">
      <LayoutGroup id={layoutGroupId}>
        <div className="relative z-0 inline-flex items-center gap-1">
          {tabs.map(({ id, label, icon: Icon }) => {
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

function NetworkPartnerProgramPerformance({
  partner,
}: {
  partner: AdminNetworkPartner;
}) {
  return (
    <div>
      <h3 className="text-content-emphasis text-sm font-semibold">
        Program performance
      </h3>
      {partner.programs.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">
          This partner is not enrolled in any programs yet.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {partner.programs.map((program) => (
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
                <StatusBadge variant={getProgramStatusVariant(program.status)}>
                  {capitalize(program.status)}
                </StatusBadge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-neutral-500">
                <div>
                  <p className="text-neutral-400">Sales</p>
                  <p className="mt-0.5 text-sm font-medium text-neutral-900">
                    {currencyFormatter(program.totalSaleAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-400">Commissions</p>
                  <p className="mt-0.5 text-sm font-medium text-neutral-900">
                    {currencyFormatter(program.totalCommissions)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getProgramStatusVariant(
  status: AdminNetworkPartner["programs"][number]["status"],
) {
  if (status === "approved" || status === "invited") {
    return "success" as const;
  }

  if (status === "pending") {
    return "pending" as const;
  }

  if (status === "banned" || status === "rejected") {
    return "error" as const;
  }

  return "neutral" as const;
}
