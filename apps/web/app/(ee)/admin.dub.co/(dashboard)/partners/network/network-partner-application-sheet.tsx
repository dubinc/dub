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
  useKeyboardShortcut,
} from "@dub/ui";
import { currencyFormatter, OG_AVATAR_URL } from "@dub/utils";
import Link from "next/link";
import { useMemo } from "react";

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
  const partnerPlatforms = useMemo(
    () =>
      (partner.platforms ?? []).map((platform) => ({
        ...platform,
        platformId: null,
        avatarUrl: null,
        subscribers: BigInt(0),
        posts: BigInt(0),
        views: BigInt(0),
      })),
    [partner.platforms],
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
              <div className="space-y-4 p-4">
                <div className="rounded-xl border border-neutral-200 bg-white p-4">
                  <div className="grid grid-cols-1 gap-5 text-sm text-neutral-600">
                    <PartnerAbout partner={partner} />
                  </div>
                </div>

                <div className="rounded-xl border border-neutral-200 bg-white p-4">
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
                                src={
                                  program.logo ||
                                  `${OG_AVATAR_URL}${program.name}`
                                }
                                alt={program.name}
                                className="size-5 rounded-full"
                              />
                              <span className="truncate text-sm font-medium text-neutral-900 group-hover:underline">
                                {program.name}
                              </span>
                            </Link>
                            <StatusBadge
                              variant={getProgramStatusVariant(program.status)}
                            >
                              {program.status}
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
