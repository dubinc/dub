import { invitePartnerFromNetworkAction } from "@/lib/actions/partners/invite-partner-from-network";
import { updateDiscoveredPartnerAction } from "@/lib/actions/partners/update-discovered-partner";
import { mutatePrefix } from "@/lib/swr/mutate";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { PartnerNetworkPartnerProps } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { X } from "@/ui/shared/icons";
import {
  Button,
  ChevronLeft,
  ChevronRight,
  Sheet,
  useKeyboardShortcut,
  useRouterStuff,
} from "@dub/ui";
import { timeAgo } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useState } from "react";
import { toast } from "sonner";
import { PartnerAbout } from "./partner-about";
import { PartnerComments } from "./partner-comments";
import { PartnerInfoCards } from "./partner-info-cards";
import { PartnerSheetTabs } from "./partner-sheet-tabs";

type PartnerNetworkPartnerSheetProps = {
  partner: PartnerNetworkPartnerProps;
  onNext?: () => void;
  onPrevious?: () => void;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

function PartnerNetworkPartnerSheetContent({
  partner,
  onPrevious,
  onNext,
  setIsOpen,
}: PartnerNetworkPartnerSheetProps) {
  const [currentTabId, setCurrentTabId] = useState<string>("about");

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  return (
    <div className="flex size-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
        <Sheet.Title className="text-lg font-semibold">
          Partner discovery
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
            type="network"
            partner={partner}
            hideStatuses={["pending"]}
            selectedGroupId={selectedGroupId}
            setSelectedGroupId={setSelectedGroupId}
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
                <div className="grid grid-cols-1 gap-5 text-sm text-neutral-600">
                  <PartnerAbout partner={partner} />
                </div>
              )}
              {currentTabId === "comments" && (
                <div>
                  <h3 className="text-content-emphasis text-lg font-semibold">
                    Comments
                  </h3>
                  <PartnerComments partnerId={partner.id} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-neutral-200 p-5">
        <PartnerControls
          key={partner.id} // Reset when navigating between partners to avoid memoized action callback issues
          partner={partner}
          groupId={selectedGroupId}
          setIsOpen={setIsOpen}
        />
      </div>
    </div>
  );
}

export function PartnerNetworkPartnerSheet({
  isOpen,
  nested,
  ...rest
}: PartnerNetworkPartnerSheetProps & {
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
      <PartnerNetworkPartnerSheetContent {...rest} />
    </Sheet>
  );
}

function PartnerControls({
  partner,
  setIsOpen,
  groupId,
}: {
  partner: PartnerNetworkPartnerProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  groupId?: string | null;
}) {
  const { id: workspaceId } = useWorkspace();
  const { program } = useProgram();

  const { executeAsync, isPending } = useAction(
    invitePartnerFromNetworkAction,
    {
      onSuccess: async () => {
        toast.success("Invitation sent to partner!");
        setIsOpen(false);
        mutatePrefix(`/api/network/partners`);
      },
      onError({ error }) {
        toast.error(error.serverError);
      },
    },
  );

  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Invite Partner",
    description:
      "Are you sure you want to invite this partner to your program?",
    confirmText: "Invite",
    confirmShortcut: "s",
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

  useKeyboardShortcut("s", () => setShowConfirmModal(true), { sheet: true });

  const alreadyInvited = Boolean(partner.invitedAt || partner.recruitedAt);

  return (
    <>
      {confirmModal}
      <div className="flex justify-end gap-2">
        {!alreadyInvited && (
          <div className="flex-shrink-0">
            <PartnerIgnoreButton partner={partner} setIsOpen={setIsOpen} />
          </div>
        )}
        <Button
          type="button"
          variant="primary"
          text={
            partner.recruitedAt
              ? `Recruited ${timeAgo(partner.recruitedAt, { withAgo: true })}`
              : partner.invitedAt
                ? `Invited ${timeAgo(partner.invitedAt, { withAgo: true })}`
                : "Send invite"
          }
          disabled={alreadyInvited}
          shortcut={alreadyInvited ? undefined : "S"}
          loading={isPending}
          onClick={() => setShowConfirmModal(true)}
          className="w-fit shrink-0"
        />
      </div>
    </>
  );
}

function PartnerIgnoreButton({
  partner,
  setIsOpen,
}: {
  partner: PartnerNetworkPartnerProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const { id: workspaceId } = useWorkspace();

  const { executeAsync: updateDiscoveredPartner, isPending } = useAction(
    updateDiscoveredPartnerAction,
    {
      onSuccess: () => {
        setIsOpen(false);
        toast.success("Hid partner successfully");
        mutatePrefix("/api/network/partners");
      },
      onError({ error }) {
        toast.error(error.serverError || "Failed to hide partner.");
      },
    },
  );

  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: `Mark "not a fit"`,
    description: "Are you sure you want to hide this partner?",
    confirmText: "Confirm",
    confirmShortcut: "n",
    confirmShortcutOptions: { sheet: true, modal: true },
    onConfirm: async () => {
      await updateDiscoveredPartner({
        workspaceId: workspaceId!,
        partnerId: partner.id,
        ignored: true,
      });
    },
  });

  useKeyboardShortcut("n", () => setShowConfirmModal(true), { sheet: true });

  return (
    <>
      {confirmModal}
      <Button
        type="button"
        variant="secondary"
        text={isPending ? "" : "Not a fit"}
        loading={isPending}
        shortcut="N"
        onClick={() => {
          setShowConfirmModal(true);
        }}
        className="px-4"
      />
    </>
  );
}
