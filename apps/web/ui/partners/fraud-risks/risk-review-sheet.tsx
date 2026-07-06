"use client";

import { FRAUD_RULES_BY_TYPE } from "@/lib/api/fraud/constants";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { FraudGroupProps } from "@/lib/types";
import { useBanPartnerModal } from "@/ui/modals/ban-partner-modal";
import { useRejectPartnerApplicationModal } from "@/ui/modals/reject-partner-application-modal";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { X } from "@/ui/shared/icons";
import { UserAvatar } from "@/ui/users/user-avatar";
import {
  ArrowUpRight2,
  Button,
  ChevronLeft,
  ChevronRight,
  Msgs,
  Sheet,
  Tooltip,
  buttonVariants,
  useKeyboardShortcut,
  useRouterStuff,
} from "@dub/ui";
import { cn, fetcher, formatDateTime } from "@dub/utils";
import { FraudRuleType } from "@prisma/client";
import Link from "next/link";
import { Dispatch, SetStateAction } from "react";
import useSWR from "swr";
import { AssociatedCommissionsTable } from "./associated-commissions-table";
import { FraudEventsTableWrapper } from "./fraud-events-tables";
import { useMarkAllAsFraudModal } from "./mark-all-as-fraud-modal";
import { PartnerCrossProgramSummary } from "./partner-cross-program-summary";
import { RequestDetailsBanner } from "./request-details-banner";
import { useResolveFraudGroupModal } from "./resolve-fraud-group-modal";
import { ResolvedRiskEventsTable } from "./resolved-risk-events-table";

interface RiskReviewSheetProps {
  fraudGroup: FraudGroupProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  onNext?: () => void;
  onPrevious?: () => void;
}

// These fraud types block commissions from being processed
const COMMISSION_BLOCKING_FRAUD_TYPE: FraudRuleType[] = [
  FraudRuleType.customerEmailMatch,
  FraudRuleType.customerEmailSuspiciousDomain,
  FraudRuleType.referralSourceBanned,
  FraudRuleType.paidTrafficDetected,
  FraudRuleType.partnerCrossProgramBan,
  FraudRuleType.partnerDuplicateAccount,
];

const SHEET_TITLES: Record<FraudGroupProps["status"], string> = {
  pending: "Risk event review",
  resolved: "Resolved risk event",
  expired: "Expired risk event",
};

function RiskReviewSheetContent({
  fraudGroup,
  onPrevious,
  onNext,
}: RiskReviewSheetProps) {
  const { partner, user } = fraudGroup;
  const { slug, id: workspaceId } = useWorkspace();

  const showCommissionsOnHold =
    fraudGroup.status === "pending" &&
    COMMISSION_BLOCKING_FRAUD_TYPE.includes(fraudGroup.type);

  const commissionsOnHoldCountKey =
    showCommissionsOnHold && workspaceId
      ? `/api/commissions/count?${new URLSearchParams({
          workspaceId,
          status: "hold",
          fraudEventGroupId: fraudGroup.id,
          partnerId: partner.id,
        }).toString()}`
      : null;

  const {
    data: commissionsOnHoldCount,
    isLoading: isCommissionsOnHoldCountLoading,
  } = useSWR<{ all: { count: number } }>(commissionsOnHoldCountKey, fetcher);

  const { setShowMarkAllAsFraudModal, MarkAllAsFraudModal } =
    useMarkAllAsFraudModal({
      fraudGroup,
      onResolve: async () => {
        onNext?.();
        mutatePrefix("/api/fraud/groups");
      },
    });

  const { setShowResolveFraudGroupModal, ResolveFraudGroupModal } =
    useResolveFraudGroupModal({
      fraudGroup,
      onConfirm: async () => {
        onNext?.();
        mutatePrefix("/api/fraud/groups");
      },
    });

  const { setShowBanPartnerModal, BanPartnerModal } = useBanPartnerModal({
    partner,
    onConfirm: async () => {
      onNext?.();
      mutatePrefix("/api/fraud/groups");
    },
  });

  const {
    RejectPartnerApplicationModal,
    setShowRejectPartnerApplicationModal,
  } = useRejectPartnerApplicationModal({
    partner,
    onConfirm: async () => {
      onNext?.();
      mutatePrefix("/api/fraud/groups");
    },
  });

  // Left/right arrow keys for previous/next risk event
  useKeyboardShortcut("ArrowRight", () => onNext?.(), { sheet: true });
  useKeyboardShortcut("ArrowLeft", () => onPrevious?.(), { sheet: true });

  // Resolve/ban/reject shortcuts
  useKeyboardShortcut("r", () => setShowResolveFraudGroupModal(true), {
    sheet: true,
  });

  useKeyboardShortcut(
    "b",
    () => {
      if (partner.status === "pending") {
        setShowRejectPartnerApplicationModal(true);
      } else {
        setShowBanPartnerModal(true);
      }
    },
    { sheet: true },
  );

  const fraudRuleInfo = FRAUD_RULES_BY_TYPE[fraudGroup.type];

  return (
    <div className="relative h-full">
      {ResolveFraudGroupModal}
      {RejectPartnerApplicationModal}
      <BanPartnerModal />
      {MarkAllAsFraudModal}
      <div
        className={cn("flex h-full flex-col transition-opacity duration-200")}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">
            {SHEET_TITLES[fraudGroup.status]}
          </Sheet.Title>

          <div className="flex items-center gap-2">
            <Link
              href={`/${slug}/program/messages/${partner.id}`}
              target="_blank"
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm font-medium",
              )}
            >
              <Msgs className="size-4 shrink-0" />
              <span className="hidden sm:inline">Message</span>
            </Link>

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
                className="ml-2 h-auto w-fit p-1"
              />
            </Sheet.Close>
          </div>
        </div>

        <div className="min-h-0 grow overflow-y-auto">
          <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:gap-6">
              {/* Partner details */}
              <Link
                href={`/${slug}/program/partners/${partner.id}`}
                target="_blank"
                className="bg-bg-muted border-border-subtle hover:bg-bg-subtle group relative flex flex-grow flex-col gap-3 rounded-xl border px-4 py-3 transition-colors"
              >
                <ArrowUpRight2 className="text-content-subtle absolute right-3 top-3 size-3.5 opacity-50 transition-opacity duration-150 group-hover:opacity-100" />
                <h2 className="text-content-default text-sm font-semibold leading-5">
                  Partner details
                </h2>
                <div className="flex min-w-0 items-center gap-3">
                  <PartnerAvatar partner={partner} className="size-10" />
                  <div className="flex min-w-0 flex-col">
                    <span className="text-content-emphasis truncate text-sm font-semibold">
                      {partner.name}
                    </span>
                    <span className="text-content-subtle truncate text-xs font-medium">
                      {partner.email}
                    </span>
                  </div>
                </div>
              </Link>

              <div className="bg-bg-muted border-border-subtle flex flex-col gap-3 rounded-xl border px-4 py-3 sm:shrink-0">
                <h2 className="text-content-default text-sm font-semibold leading-5">
                  Program owner activity
                </h2>
                <div className="flex flex-col gap-2">
                  <PartnerCrossProgramSummary partnerId={partner.id} />
                </div>
              </div>
            </div>

            <div className="border-border-subtle flex flex-col gap-4 rounded-xl border p-4">
              <div className="flex flex-col">
                <span className="text-content-default text-sm font-semibold">
                  {fraudRuleInfo.name}
                </span>
                <span className="text-content-subtle text-xs font-normal">
                  {fraudRuleInfo.description}
                </span>
              </div>

              {fraudGroup.type === FraudRuleType.paidTrafficDetected &&
                fraudGroup.status === "pending" && (
                  <RequestDetailsBanner fraudGroup={fraudGroup} />
                )}

              <FraudEventsTableWrapper fraudGroup={fraudGroup} />
            </div>

            {fraudGroup.status === "pending" &&
              COMMISSION_BLOCKING_FRAUD_TYPE.includes(fraudGroup.type) && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-content-emphasis font-semibold leading-6">
                      Associated commissions
                    </h3>
                    <Button
                      type="button"
                      variant="secondary"
                      text="Mark all as fraud"
                      className="h-7 w-fit shrink-0 rounded-lg px-2.5 py-2"
                      disabled={
                        isCommissionsOnHoldCountLoading ||
                        (commissionsOnHoldCount?.all.count ?? 0) === 0
                      }
                      onClick={() => setShowMarkAllAsFraudModal(true)}
                    />
                  </div>
                  <AssociatedCommissionsTable fraudGroup={fraudGroup} />
                </div>
              )}

            {fraudGroup.status === "pending" && (
              <ResolvedRiskEventsTable partnerId={partner.id} />
            )}

            {fraudGroup.status === "resolved" && (
              <div>
                <h3 className="text-content-emphasis mb-4 font-semibold">
                  Decision
                </h3>

                <div
                  className={cn(
                    "flex gap-3",
                    fraudGroup.resolutionReason
                      ? "items-start"
                      : "items-center",
                  )}
                >
                  <Tooltip
                    content={
                      <div className="flex flex-col gap-1 p-2.5">
                        {user && (
                          <div className="flex flex-col gap-2">
                            <UserAvatar
                              user={user}
                              className="size-6 shrink-0"
                            />
                            <p className="text-sm font-medium">{user.name}</p>
                          </div>
                        )}

                        <div className="text-xs text-neutral-500">
                          Resolved by{" "}
                          <span className="font-medium text-neutral-700">
                            {fraudGroup.resolvedAt
                              ? formatDateTime(fraudGroup.resolvedAt)
                              : "Unknown"}
                          </span>
                        </div>
                      </div>
                    }
                  >
                    {user && (
                      <UserAvatar user={user} className="size-5 shrink-0" />
                    )}
                  </Tooltip>

                  <div className="flex flex-col gap-1">
                    {fraudGroup.resolvedAt && (
                      <span className="text-sm font-medium text-neutral-600">
                        {fraudGroup.resolvedAt
                          ? formatDateTime(fraudGroup.resolvedAt)
                          : "-"}
                      </span>
                    )}

                    {fraudGroup.resolutionReason && (
                      <span className="text-content-subtle text-sm font-medium">
                        {fraudGroup.resolutionReason}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {fraudGroup.status === "pending" && (
          <div className="flex flex-col justify-end">
            <div className="border-border-subtle flex items-center justify-end gap-2 border-t px-5 py-4">
              <Button
                type="button"
                variant="secondary"
                text="Resolve event"
                shortcut="R"
                onClick={() => setShowResolveFraudGroupModal(true)}
                className="h-8 w-fit rounded-lg"
              />

              {partner.status === "pending" ? (
                <Button
                  type="button"
                  text="Reject application"
                  shortcut="B"
                  variant="danger"
                  onClick={() => setShowRejectPartnerApplicationModal(true)}
                  className="h-8 w-fit rounded-lg"
                />
              ) : (
                <Button
                  type="button"
                  text="Ban partner"
                  shortcut="B"
                  variant="danger"
                  onClick={() => setShowBanPartnerModal(true)}
                  className="h-8 w-fit rounded-lg"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function RiskReviewSheet({
  isOpen,
  nested,
  ...rest
}: RiskReviewSheetProps & {
  isOpen: boolean;
  nested?: boolean;
}) {
  const { queryParams } = useRouterStuff();

  const handleOpenChange = (open: boolean) => {
    // Only update if the value actually changed
    if (open === isOpen) return;

    rest.setIsOpen(open);

    // Clear the groupId from URL when closing
    if (!open) {
      queryParams({ del: "groupId" });
    }
  };

  return (
    <Sheet
      open={isOpen}
      onOpenChange={handleOpenChange}
      nested={nested}
      contentProps={{
        className: "[--sheet-width:940px]",
      }}
    >
      <RiskReviewSheetContent {...rest} />
    </Sheet>
  );
}
