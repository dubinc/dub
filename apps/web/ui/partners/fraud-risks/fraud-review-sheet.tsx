"use client";

import { FRAUD_RULES_BY_TYPE } from "@/lib/api/fraud/constants";
import { fraudEventGroupProps } from "@/lib/types";
import { useBanPartnerModal } from "@/ui/modals/ban-partner-modal";
import { X } from "@/ui/shared/icons";
import {
  Button,
  ChevronLeft,
  ChevronRight,
  Msgs,
  Sheet,
  Tooltip,
  User,
  buttonVariants,
  useKeyboardShortcut,
  useRouterStuff,
} from "@dub/ui";
import { OG_AVATAR_URL, cn, formatDateTime } from "@dub/utils";
import { useResolveFraudEventsModal } from "app/app.dub.co/(dashboard)/[slug]/(ee)/program/fraud/resolve-fraud-events-modal";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Dispatch, SetStateAction, useState } from "react";
import { CommissionsOnHoldTable } from "./commissions-on-hold-table";
import { FraudEventsTableWrapper } from "./fraud-events-tables";

interface FraudReviewSheetProps {
  fraudEventGroup: fraudEventGroupProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  onNext?: () => void;
  onPrevious?: () => void;
}

function FraudReviewSheetContent({
  fraudEventGroup,
  onPrevious,
  onNext,
}: FraudReviewSheetProps) {
  const { partner, user } = fraudEventGroup;

  const { slug } = useParams();

  const { setShowResolveFraudEventModal, ResolveFraudEventModal } =
    useResolveFraudEventsModal({
      fraudEventGroup,
      onConfirm: () => {
        onNext?.();
      },
    });

  const { BanPartnerModal, setShowBanPartnerModal } = useBanPartnerModal({
    partner,
    onConfirm: async () => {
      onNext?.();
    },
  });

  // Left/right arrow keys for previous/next fraud event
  useKeyboardShortcut("ArrowRight", () => onNext?.(), { sheet: true });
  useKeyboardShortcut("ArrowLeft", () => onPrevious?.(), { sheet: true });

  // Resolve/ban shortcuts
  useKeyboardShortcut("r", () => setShowResolveFraudEventModal(true), {
    sheet: true,
  });
  useKeyboardShortcut("b", () => setShowBanPartnerModal(true), { sheet: true });

  const fraudRuleInfo = FRAUD_RULES_BY_TYPE[fraudEventGroup.type];

  return (
    <div className="relative h-full">
      <ResolveFraudEventModal />
      <BanPartnerModal />
      <div
        className={cn("flex h-full flex-col transition-opacity duration-200")}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">
            {fraudEventGroup.status === "pending"
              ? "Fraud review"
              : "Resolved fraud and risk event"}
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

        <div className="min-h-0 grow overflow-y-auto">
          <div className="flex flex-col gap-6 p-6">
            {/* Partner details */}
            <div className="bg-bg-muted border-border-subtle flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src={partner.image || `${OG_AVATAR_URL}${partner.name}`}
                  alt={partner.name}
                  className="size-10 rounded-full"
                />
                <div className="flex min-w-0 flex-col">
                  <span className="text-content-emphasis truncate text-sm font-semibold">
                    {partner.name}
                  </span>
                  <span className="text-content-subtle truncate text-xs font-medium">
                    {partner.email}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/${slug}/program/messages/${partner.id}`}
                  target="_blank"
                  className={cn(
                    buttonVariants({ variant: "secondary" }),
                    "flex h-8 items-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm font-medium",
                  )}
                >
                  <Msgs className="size-4 shrink-0" />
                  <span className="hidden sm:inline">Message</span>
                </Link>

                <Link
                  href={`/${slug}/program/partners/${partner.id}`}
                  target="_blank"
                  className={cn(
                    buttonVariants({ variant: "secondary" }),
                    "flex h-8 items-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm font-medium",
                  )}
                >
                  <User className="size-4 shrink-0" />
                  <span className="hidden sm:inline">View profile</span>
                </Link>
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

              <FraudEventsTableWrapper fraudEventGroup={fraudEventGroup} />
            </div>

            {fraudEventGroup.status === "pending" && (
              <div>
                <h3 className="text-content-emphasis mb-4 font-semibold">
                  Commissions on hold
                </h3>
                <CommissionsOnHoldTable fraudEventGroup={fraudEventGroup} />
              </div>
            )}

            {fraudEventGroup.status === "resolved" && (
              <div>
                <h3 className="text-content-emphasis mb-4 font-semibold">
                  Decision
                </h3>

                <div
                  className={cn(
                    "flex gap-3",
                    fraudEventGroup.resolutionReason
                      ? "items-start"
                      : "items-center",
                  )}
                >
                  <Tooltip
                    content={
                      <div className="flex flex-col gap-1 p-2.5">
                        {user && (
                          <div className="flex flex-col gap-2">
                            <img
                              src={user.image || `${OG_AVATAR_URL}${user.name}`}
                              alt={user.name || user.id}
                              className="size-6 shrink-0 rounded-full"
                            />
                            <p className="text-sm font-medium">{user.name}</p>
                          </div>
                        )}

                        <div className="text-xs text-neutral-500">
                          Resolved by{" "}
                          <span className="font-medium text-neutral-700">
                            {fraudEventGroup.resolvedAt
                              ? formatDateTime(fraudEventGroup.resolvedAt)
                              : "Unknown"}
                          </span>
                        </div>
                      </div>
                    }
                  >
                    {user && (
                      <img
                        src={user.image || `${OG_AVATAR_URL}${user.name}`}
                        alt={user.name || user.id}
                        className="size-5 shrink-0 rounded-full"
                      />
                    )}
                  </Tooltip>

                  <div className="flex flex-col gap-1">
                    {fraudEventGroup.resolvedAt && (
                      <span className="text-sm font-medium text-neutral-600">
                        {fraudEventGroup.resolvedAt
                          ? formatDateTime(fraudEventGroup.resolvedAt)
                          : "-"}
                      </span>
                    )}

                    {fraudEventGroup.resolutionReason && (
                      <span className="text-content-subtle text-sm font-medium">
                        {fraudEventGroup.resolutionReason}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {fraudEventGroup.status === "pending" && (
          <div className="flex flex-col justify-end">
            <div className="border-border-subtle flex items-center justify-end gap-2 border-t px-5 py-4">
              <Button
                type="button"
                variant="secondary"
                text="Resolve event"
                shortcut="R"
                onClick={() => setShowResolveFraudEventModal(true)}
                className="h-8 w-fit rounded-lg"
              />

              <Button
                type="button"
                text="Ban partner"
                shortcut="B"
                variant="danger"
                onClick={() => setShowBanPartnerModal(true)}
                className="h-8 w-fit rounded-lg"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function FraudReviewSheet({
  isOpen,
  nested,
  ...rest
}: FraudReviewSheetProps & {
  isOpen: boolean;
  nested?: boolean;
}) {
  const { queryParams } = useRouterStuff();

  return (
    <Sheet
      open={isOpen}
      onOpenChange={rest.setIsOpen}
      onClose={() => queryParams({ del: "groupKey", scroll: false })}
      nested={nested}
      contentProps={{
        className: "[--sheet-width:940px]",
      }}
    >
      <FraudReviewSheetContent {...rest} />
    </Sheet>
  );
}

export function useFraudReviewSheet(
  props: Omit<FraudReviewSheetProps, "setIsOpen">,
) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    fraudReviewSheet: (
      <FraudReviewSheet setIsOpen={setIsOpen} isOpen={isOpen} {...props} />
    ),
    setIsOpen,
  };
}
