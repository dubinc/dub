import { bulkApproveProgramApplicationsAction } from "@/lib/actions/partners/bulk-approve-program-applications";
import { mutatePrefix } from "@/lib/swr/mutate";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { PartnerProps } from "@/lib/types";
import { useTrialLimitActivateModal } from "@/ui/modals/trial-limit-activate-modal";
import { GroupSelector } from "@/ui/partners/groups/group-selector";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { Button, Modal, useKeyboardShortcut } from "@dub/ui";
import { cn, isWorkspaceBillingTrialActive, pluralize } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

type BulkApproveProgramApplicationsModalOptions = {
  partners: Pick<PartnerProps, "id" | "name" | "email" | "image">[];
  groupId?: string | null;
  onConfirm?: () => void | Promise<void>;
  confirmShortcutOptions?: {
    modal?: boolean;
    sheet?: boolean;
  };
};

function BulkApproveProgramApplicationsModal({
  showBulkApproveProgramApplicationsModal,
  setShowBulkApproveProgramApplicationsModal,
  partners,
  groupId,
  onConfirm,
  confirmShortcutOptions,
}: BulkApproveProgramApplicationsModalOptions & {
  showBulkApproveProgramApplicationsModal: boolean;
  setShowBulkApproveProgramApplicationsModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { id: workspaceId, trialEndsAt } = useWorkspace();
  const { program } = useProgram();
  const { openTrialLimitModal, TrialLimitActivateModal } =
    useTrialLimitActivateModal();
  const trialActive = isWorkspaceBillingTrialActive(trialEndsAt);

  const initialGroupId = groupId ?? program?.defaultGroupId ?? null;
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    initialGroupId,
  );

  useEffect(() => {
    if (showBulkApproveProgramApplicationsModal) {
      setSelectedGroupId(initialGroupId);
    }
  }, [showBulkApproveProgramApplicationsModal, initialGroupId]);

  const { executeAsync, isPending } = useAction(
    bulkApproveProgramApplicationsAction,
    {
      onSuccess: async () => {
        setShowBulkApproveProgramApplicationsModal(false);
        toast.success(`${pluralize("Partner", partners.length)} approved.`);
        await onConfirm?.();
        await mutatePrefix(["/api/partners", "/api/program-applications"]);
      },
      onError({ error }) {
        const serverMsg = String(error.serverError ?? "").trim();
        if (
          trialActive &&
          (serverMsg.includes("free trial") ||
            serverMsg.includes("enrolled partners"))
        ) {
          openTrialLimitModal("partnerEnrollments");
          return;
        }
        const message =
          serverMsg ||
          ("message" in error &&
          typeof (error as { message?: unknown }).message === "string"
            ? String((error as { message: string }).message).trim()
            : "");
        toast.error(message || "An error occurred");
      },
    },
  );

  const handleBulkApprove = useCallback(async () => {
    const partnerIds = partners.map((p) => p.id);

    if (!workspaceId || partnerIds.length === 0) {
      return;
    }

    await executeAsync({
      workspaceId,
      partnerIds,
      groupId: selectedGroupId,
    });
  }, [partners, workspaceId, selectedGroupId, executeAsync]);

  useKeyboardShortcut("a", handleBulkApprove, {
    enabled: showBulkApproveProgramApplicationsModal && !isPending,
    ...(confirmShortcutOptions || { modal: true }),
  });

  return (
    <>
      <TrialLimitActivateModal />
      <Modal
        showModal={showBulkApproveProgramApplicationsModal}
        setShowModal={setShowBulkApproveProgramApplicationsModal}
      >
        <div className="space-y-1 border-b border-neutral-200 p-4 sm:p-6">
          <h3 className="text-lg font-semibold leading-none">
            Approve {pluralize("application", partners.length)}
          </h3>

          <p className="text-content-subtle text-base font-medium">
            Are you sure you want to approve{" "}
            {pluralize("this application", partners.length, {
              plural: "these applications",
            })}
            ?
          </p>
        </div>

        <div className="space-y-6 bg-neutral-50 p-4 sm:p-6">
          {partners.length === 1 ? (
            <div className="flex items-center gap-4 rounded-lg border border-neutral-200 bg-neutral-100 p-3">
              <PartnerAvatar
                partner={partners[0]}
                className="size-10 bg-white"
              />
              <div className="flex min-w-0 flex-col">
                <h4 className="truncate text-sm font-medium text-neutral-900">
                  {partners[0].name}
                </h4>
                <p className="truncate text-xs text-neutral-500">
                  {partners[0].email}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-100 p-3">
              <div className="flex items-center">
                {partners.slice(0, 3).map((partner, index) => (
                  <PartnerAvatar
                    key={partner.id}
                    partner={partner}
                    className={cn(
                      "inline-block size-7 border-2 border-neutral-100",
                      index > 0 && "-ml-2.5",
                    )}
                  />
                ))}
              </div>
              <span className="text-base font-semibold text-neutral-900">
                {partners.length} {pluralize("partner", partners.length)}{" "}
                selected
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-900">
                Assign {partners.length > 1 ? "all " : ""}to group
              </label>

              <div className="relative mt-2 rounded-md shadow-sm">
                <GroupSelector
                  selectedGroupId={selectedGroupId}
                  setSelectedGroupId={setSelectedGroupId}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
          <Button
            onClick={() => setShowBulkApproveProgramApplicationsModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
            disabled={isPending}
          />
          <Button
            onClick={handleBulkApprove}
            autoFocus
            loading={isPending}
            text="Approve"
            shortcut="A"
            className="h-8 w-fit px-3"
          />
        </div>
      </Modal>
    </>
  );
}

export function useBulkApproveProgramApplicationsModal({
  partners,
  groupId,
  onConfirm,
  confirmShortcutOptions,
}: BulkApproveProgramApplicationsModalOptions) {
  const [
    showBulkApproveProgramApplicationsModal,
    setShowBulkApproveProgramApplicationsModal,
  ] = useState(false);

  const BulkApproveProgramApplicationsModalCallback = useMemo(() => {
    return (
      <BulkApproveProgramApplicationsModal
        showBulkApproveProgramApplicationsModal={
          showBulkApproveProgramApplicationsModal
        }
        setShowBulkApproveProgramApplicationsModal={
          setShowBulkApproveProgramApplicationsModal
        }
        partners={partners}
        groupId={groupId}
        onConfirm={onConfirm}
        confirmShortcutOptions={confirmShortcutOptions}
      />
    );
  }, [
    showBulkApproveProgramApplicationsModal,
    partners,
    groupId,
    onConfirm,
    confirmShortcutOptions,
  ]);

  return useMemo(
    () => ({
      setShowBulkApproveProgramApplicationsModal,
      BulkApproveProgramApplicationsModal:
        BulkApproveProgramApplicationsModalCallback,
    }),
    [
      setShowBulkApproveProgramApplicationsModal,
      BulkApproveProgramApplicationsModalCallback,
    ],
  );
}
