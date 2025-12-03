import { approvePartnerAction } from "@/lib/actions/partners/approve-partner";
import { mutatePrefix } from "@/lib/swr/mutate";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { useRejectPartnerApplicationModal } from "@/ui/modals/reject-partner-application-modal";
import { X } from "@/ui/shared/icons";
import {
  Button,
  ChevronLeft,
  ChevronRight,
  Msgs,
  Sheet,
  useKeyboardShortcut,
  useRouterStuff,
} from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { toast } from "sonner";
import { PartnerAbout } from "./partner-about";
import { PartnerApplicationDetails } from "./partner-application-details";
import { PartnerComments } from "./partner-comments";
import { PartnerInfoCards } from "./partner-info-cards";
import { PartnerSheetTabs } from "./partner-sheet-tabs";

type PartnerApplicationSheetProps = {
  partner: EnrolledPartnerProps;
  onNext?: () => void;
  onPrevious?: () => void;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

function PartnerApplicationSheetContent({
  partner,
  onPrevious,
  onNext,
  setIsOpen,
}: PartnerApplicationSheetProps) {
  const { slug: workspaceSlug } = useWorkspace();
  const [currentTabId, setCurrentTabId] = useState<string>("about");

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    partner.groupId ?? null,
  );

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

  // Reset selection when navigating between partners
  useEffect(() => {
    setSelectedGroupId(partner.groupId ?? null);
  }, [partner.groupId]);

  return (
    <div className="flex size-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
        <Sheet.Title className="text-lg font-semibold">
          Partner application
        </Sheet.Title>
        <div className="flex items-center gap-4">
          <Link
            href={`/${workspaceSlug}/program/messages/${partner.id}`}
            target="_blank"
          >
            <Button
              variant="secondary"
              text="Message"
              icon={<Msgs className="size-4 shrink-0" />}
              className="hidden h-9 rounded-lg px-4 sm:flex"
            />
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
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>
      </div>

      <div className="@3xl/sheet:grid-cols-[minmax(440px,1fr)_minmax(0,360px)] scrollbar-hide grid min-h-0 grow grid-cols-1 gap-x-6 gap-y-4 overflow-y-auto p-4 sm:p-6">
        <div className="@3xl/sheet:order-2">
          <PartnerInfoCards
            partner={partner}
            hideStatuses={["pending"]}
            {...(partner.status === "rejected" && {
              selectedGroupId,
              setSelectedGroupId,
            })}
            showApplicationRiskAnalysis={true}
          />
        </div>
        <div className="@3xl/sheet:order-1">
          <div className="border-border-subtle overflow-hidden rounded-xl border bg-neutral-100">
            <PartnerSheetTabs
              partnerId={partner.id}
              currentTabId={currentTabId}
              setCurrentTabId={setCurrentTabId}
            />
            <div className="border-border-subtle -mx-px -mb-px rounded-xl border bg-white p-4">
              {currentTabId === "about" && (
                <PartnerApplicationAbout partner={partner} />
              )}
              {currentTabId === "comments" && (
                <PartnerApplicationComments partnerId={partner.id} />
              )}
            </div>
          </div>
        </div>
      </div>

      {["pending", "rejected"].includes(partner.status) && (
        <div className="shrink-0 border-t border-neutral-200 p-5">
          <PartnerApproval
            key={partner.id} // Reset when navigating between partners to avoid memoized action callback issues
            partner={partner}
            groupId={
              partner.status === "rejected" ? selectedGroupId : partner.groupId
            }
            setIsOpen={setIsOpen}
            onNext={onNext}
          />
        </div>
      )}
    </div>
  );
}

function PartnerApplicationAbout({
  partner,
}: {
  partner: EnrolledPartnerProps;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 text-sm text-neutral-600">
      {partner.applicationId && (
        <>
          <h3 className="text-content-emphasis text-lg font-semibold">
            Application
          </h3>
          <PartnerApplicationDetails applicationId={partner.applicationId} />
          <hr className="border-neutral-200" />
        </>
      )}
      <PartnerAbout partner={partner} />
    </div>
  );
}

function PartnerApplicationComments({ partnerId }: { partnerId: string }) {
  return (
    <div>
      <h3 className="text-content-emphasis text-lg font-semibold">Comments</h3>
      <PartnerComments partnerId={partnerId} />
    </div>
  );
}

export function PartnerApplicationSheet({
  isOpen,
  nested,
  ...rest
}: PartnerApplicationSheetProps & {
  isOpen: boolean;
  nested?: boolean;
}) {
  const { queryParams } = useRouterStuff();
  return (
    <Sheet
      open={isOpen}
      onOpenChange={rest.setIsOpen}
      onClose={() => queryParams({ del: "partnerId", scroll: false })}
      nested={nested}
      contentProps={{
        // 540px - 1170px width based on viewport
        className: "md:w-[max(min(calc(100vw-334px),1170px),540px)]",
      }}
    >
      <PartnerApplicationSheetContent {...rest} />
    </Sheet>
  );
}

function PartnerApproval({
  partner,
  groupId,
  setIsOpen,
  onNext,
}: {
  partner: EnrolledPartnerProps;
  groupId?: string | null;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  onNext?: () => void;
}) {
  const { id: workspaceId } = useWorkspace();
  const { program } = useProgram();

  const { executeAsync, isPending } = useAction(approvePartnerAction, {
    onSuccess: () => {
      onNext ? onNext() : setIsOpen(false);
      toast.success(`Successfully approved ${partner.email} to your program.`);
      mutatePrefix("/api/partners");
    },
    onError({ error }) {
      toast.error(error.serverError || "Failed to approve partner.");
    },
  });

  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Approve Partner",
    description: "Are you sure you want to approve this partner application?",
    confirmText: "Approve",
    confirmShortcut: "a",
    confirmShortcutOptions: { sheet: true, modal: true },
    onConfirm: async () => {
      if (!program || !workspaceId) return;

      await executeAsync({
        workspaceId: workspaceId,
        partnerId: partner.id,
        groupId,
      });
    },
  });

  useKeyboardShortcut("a", () => setShowConfirmModal(true), { sheet: true });

  return (
    <>
      {confirmModal}
      <div className="flex justify-end gap-2">
        {partner.status !== "rejected" && (
          <div className="flex-shrink-0">
            <PartnerRejectButton
              partner={partner}
              setIsOpen={setIsOpen}
              onNext={onNext}
            />
          </div>
        )}
        <Button
          type="button"
          variant="primary"
          text="Approve"
          shortcut="A"
          loading={isPending}
          onClick={() => setShowConfirmModal(true)}
          className="w-fit shrink-0"
        />
      </div>
    </>
  );
}

function PartnerRejectButton({
  partner,
  setIsOpen,
  onNext,
}: {
  partner: EnrolledPartnerProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  onNext?: () => void;
}) {
  const {
    RejectPartnerApplicationModal,
    setShowRejectPartnerApplicationModal,
  } = useRejectPartnerApplicationModal({
    partner,
    onConfirm: async () => {
      onNext ? onNext() : setIsOpen(false);
      toast.success(
        `Partner ${partner.email} has been rejected from your program.`,
      );
      await mutatePrefix("/api/partners");
    },
    confirmShortcutOptions: { sheet: true, modal: true },
  });

  useKeyboardShortcut("r", () => setShowRejectPartnerApplicationModal(true), {
    sheet: true,
  });

  return (
    <>
      {RejectPartnerApplicationModal}
      <Button
        type="button"
        variant="secondary"
        text="Reject"
        shortcut="R"
        onClick={() => {
          setShowRejectPartnerApplicationModal(true);
        }}
        className="px-4"
      />
    </>
  );
}
