import { ReferralProps } from "@/lib/types";
import { useConfirmReferralStatusChangeModal } from "@/ui/modals/confirm-referral-status-change-modal";
import { X } from "@/ui/shared/icons";
import { ReferralStatus } from "@dub/prisma/client";
import {
  Button,
  ChevronLeft,
  ChevronRight,
  Sheet,
  useKeyboardShortcut,
  useRouterStuff,
} from "@dub/ui";
import { Dispatch, SetStateAction, useState } from "react";
import { ReferralActivitySection } from "../activity-logs/referral-activity-section";
import { ReferralDetails } from "./referral-details";
import { ReferralLeadDetails } from "./referral-lead-details";
import { ReferralPartnerDetails } from "./referral-partner-details";

type ReferralSheetProps = {
  referral: ReferralProps;
  onNext?: () => void;
  onPrevious?: () => void;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

function ReferralSheetContent({
  referral,
  onPrevious,
  onNext,
  setIsOpen,
}: ReferralSheetProps) {
  const [pendingStatus, setPendingStatus] = useState<ReferralStatus | null>(
    null,
  );

  const {
    ConfirmReferralStatusChangeModal,
    openConfirmReferralStatusChangeModal,
  } = useConfirmReferralStatusChangeModal({
    onClose: () => setPendingStatus(null),
  });

  const hasPendingStatusChange =
    pendingStatus !== null && pendingStatus !== referral.status;

  // right arrow key onNext
  useKeyboardShortcut(
    "ArrowRight",
    () => {
      if (onNext) {
        onNext();
      }
    },
    { sheet: true },
  );

  // left arrow key onPrevious
  useKeyboardShortcut(
    "ArrowLeft",
    () => {
      if (onPrevious) {
        onPrevious();
      }
    },
    { sheet: true },
  );

  // Escape key to close sheet
  useKeyboardShortcut(
    "Escape",
    () => {
      setIsOpen(false);
    },
    { sheet: true },
  );

  const handleStatusChange = (newStatus: ReferralStatus) => {
    setPendingStatus(newStatus === referral.status ? null : newStatus);
  };

  const handleSaveStatusChange = () => {
    if (pendingStatus !== null) {
      openConfirmReferralStatusChangeModal(referral, pendingStatus);
    }
  };

  return (
    <>
      <ConfirmReferralStatusChangeModal />
      <div className="flex size-full flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">
            Partner referral
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
          {/* Left side - Referral details */}
          <div className="flex flex-col gap-6">
            <ReferralDetails referral={{ formData: referral.formData }} />
            <ReferralActivitySection referralId={referral.id} />
          </div>

          {/* Right side - Two cards */}
          <div className="@3xl/sheet:order-2 flex flex-col gap-4">
            <ReferralLeadDetails
              referral={referral}
              selectedStatus={pendingStatus ?? referral.status}
              onStatusChange={handleStatusChange}
            />
            <ReferralPartnerDetails referral={referral} />
          </div>
        </div>

        {hasPendingStatusChange && (
          <div className="shrink-0 border-t border-neutral-200 p-5">
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                text="Cancel"
                className="h-9 w-fit shrink-0"
                onClick={() => setPendingStatus(null)}
              />
              <Button
                type="button"
                variant="primary"
                text="Save changes"
                className="h-9 w-fit shrink-0"
                onClick={handleSaveStatusChange}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export function ReferralSheet({
  isOpen,
  nested,
  ...rest
}: ReferralSheetProps & {
  isOpen: boolean;
  nested?: boolean;
}) {
  const { queryParams } = useRouterStuff();
  return (
    <Sheet
      open={isOpen}
      onOpenChange={rest.setIsOpen}
      onClose={() => queryParams({ del: "referralId", scroll: false })}
      nested={nested}
      contentProps={{
        // 540px - 1170px width based on viewport
        className: "md:w-[max(min(calc(100vw-334px),1170px),540px)]",
      }}
    >
      <ReferralSheetContent {...rest} />
    </Sheet>
  );
}
