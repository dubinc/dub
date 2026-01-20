import { ReferralProps } from "@/lib/types";
import { useMarkPartnerReferralClosedLostModal } from "@/ui/modals/mark-partner-referral-closed-lost-modal";
import { useMarkPartnerReferralClosedWonModal } from "@/ui/modals/mark-partner-referral-closed-won-modal";
import { useQualifyPartnerReferralModal } from "@/ui/modals/qualify-partner-referral-modal";
import { useUnqualifyPartnerReferralModal } from "@/ui/modals/unqualify-partner-referral-modal";
import { X } from "@/ui/shared/icons";
import {
  Button,
  ChevronLeft,
  ChevronRight,
  Sheet,
  useKeyboardShortcut,
  useRouterStuff,
} from "@dub/ui";
import { Dispatch, SetStateAction } from "react";
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
  const { setShowQualifyModal, QualifyModal, isQualifying } =
    useQualifyPartnerReferralModal({ referral });

  const { setShowUnqualifyModal, UnqualifyModal, isUnqualifying } =
    useUnqualifyPartnerReferralModal({ referral });

  const {
    setShowModal: setShowClosedWonModal,
    ClosedWonModal,
    isMarkingClosedWon,
  } = useMarkPartnerReferralClosedWonModal({ referral });

  const { setShowClosedLostModal, ClosedLostModal, isMarkingClosedLost } =
    useMarkPartnerReferralClosedLostModal({ referral });

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

  // Determine which buttons to show based on status
  const showQualifyButtons = referral.status === "pending";
  const showClosedButtons = referral.status === "qualified";
  const showNoActions = ["unqualified", "closedWon", "closedLost"].includes(
    referral.status,
  );

  // Keyboard shortcuts for action buttons
  useKeyboardShortcut(
    "u",
    () => {
      if (showQualifyButtons && !isUnqualifying) {
        setShowUnqualifyModal(true);
      }
    },
    { sheet: true },
  );

  useKeyboardShortcut(
    "q",
    () => {
      if (showQualifyButtons && !isQualifying) {
        setShowQualifyModal(true);
      }
    },
    { sheet: true },
  );

  useKeyboardShortcut(
    "l",
    () => {
      if (showClosedButtons && !isMarkingClosedLost) {
        setShowClosedLostModal(true);
      }
    },
    { sheet: true },
  );

  useKeyboardShortcut(
    "w",
    () => {
      if (showClosedButtons && !isMarkingClosedWon) {
        setShowClosedWonModal(true);
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

  return (
    <>
      {QualifyModal}
      {UnqualifyModal}
      {ClosedWonModal}
      {ClosedLostModal}
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
          <ReferralDetails referral={{ formData: referral.formData }} />

          {/* Right side - Two cards */}
          <div className="@3xl/sheet:order-2 flex flex-col gap-4">
            <ReferralLeadDetails referral={referral} />
            <ReferralPartnerDetails referral={referral} />
          </div>
        </div>

        {!showNoActions && (
          <div className="shrink-0 border-t border-neutral-200 p-5">
            <div className="flex justify-end gap-2">
              {showQualifyButtons && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    text="Unqualify"
                    shortcut="U"
                    onClick={() => setShowUnqualifyModal(true)}
                    disabled={isUnqualifying}
                    className="h-9 w-fit shrink-0"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    text="Qualify"
                    shortcut="Q"
                    onClick={() => setShowQualifyModal(true)}
                    disabled={isQualifying}
                    className="h-9 w-fit shrink-0"
                  />
                </>
              )}

              {showClosedButtons && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    text="Closed lost"
                    shortcut="L"
                    onClick={() => setShowClosedLostModal(true)}
                    disabled={isMarkingClosedLost}
                    className="h-9 w-fit shrink-0"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    text="Closed won"
                    shortcut="W"
                    onClick={() => setShowClosedWonModal(true)}
                    disabled={isMarkingClosedWon}
                    className="h-9 w-fit shrink-0"
                  />
                </>
              )}
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
