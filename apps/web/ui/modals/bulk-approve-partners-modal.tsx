import { approvePartnerAction } from "@/lib/actions/partners/approve-partner";
import { bulkApprovePartnersAction } from "@/lib/actions/partners/bulk-approve-partners";
import { mutatePrefix } from "@/lib/swr/mutate";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { GroupSelector } from "@/ui/partners/groups/group-selector";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { Button, Modal, useKeyboardShortcut } from "@dub/ui";
import { cn, pluralize } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

export type BulkApprovePartnersPayload = {
  partners: EnrolledPartnerProps[];
  initialGroupId?: string | null;
  onApproveSuccess?: () => void | Promise<void>;
  /** When opening over the application sheet, pass `{ modal: true, sheet: true }` so the Approve shortcut still fires. */
  keyboardShortcutOptions?: { modal?: boolean; sheet?: boolean };
};

function BulkApprovePartnersModal({
  bulkApprovePayload,
  setBulkApprovePayload,
}: {
  bulkApprovePayload: BulkApprovePartnersPayload | null;
  setBulkApprovePayload: Dispatch<
    SetStateAction<BulkApprovePartnersPayload | null>
  >;
}) {
  const { id: workspaceId } = useWorkspace();
  const { program } = useProgram();

  const partners = bulkApprovePayload?.partners ?? [];
  const showModal = Boolean(bulkApprovePayload && partners.length > 0);

  const payloadRef = useRef(bulkApprovePayload);
  payloadRef.current = bulkApprovePayload;

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    program?.defaultGroupId ?? null,
  );

  const runAfterApproveSuccess = useCallback(async () => {
    const payload = payloadRef.current;
    const onApproveSuccess = payload?.onApproveSuccess;
    const count = payload?.partners.length ?? 0;
    setBulkApprovePayload(null);
    await mutatePrefix(["/api/partners", "/api/partners/count"]);
    toast.success(`${pluralize("Partner", count)} approved.`);
    await onApproveSuccess?.();
  }, [setBulkApprovePayload]);

  const { executeAsync: bulkExecuteAsync, isPending: isBulkPending } =
    useAction(bulkApprovePartnersAction, {
      onSuccess: runAfterApproveSuccess,
      onError({ error }) {
        toast.error(error.serverError);
      },
    });

  const { executeAsync: singleExecuteAsync, isPending: isSinglePending } =
    useAction(approvePartnerAction, {
      onSuccess: runAfterApproveSuccess,
      onError: ({ error }) => {
        toast.error(error.serverError || "Failed to approve partner.");
      },
    });

  useEffect(() => {
    if (!bulkApprovePayload || !showModal) return;

    const { partners: p, initialGroupId } = bulkApprovePayload;
    const defaultGroup = program?.defaultGroupId ?? null;

    if (initialGroupId !== undefined) {
      setSelectedGroupId(initialGroupId ?? defaultGroup);
    } else if (p.length === 1) {
      setSelectedGroupId(p[0].groupId ?? defaultGroup);
    } else {
      setSelectedGroupId(defaultGroup);
    }
  }, [bulkApprovePayload, program?.defaultGroupId, showModal]);

  const handleApprove = useCallback(async () => {
    if (!workspaceId || partners.length === 0) return;

    const useSingleRejectedApprove =
      partners.length === 1 && partners[0].status === "rejected";

    if (useSingleRejectedApprove) {
      await singleExecuteAsync({
        workspaceId,
        partnerId: partners[0].id,
        groupId: selectedGroupId ?? undefined,
      });
    } else {
      await bulkExecuteAsync({
        workspaceId,
        partnerIds: partners.map((p) => p.id),
        groupId: selectedGroupId,
      });
    }
  }, [
    workspaceId,
    partners,
    selectedGroupId,
    bulkExecuteAsync,
    singleExecuteAsync,
  ]);

  const isPending = isBulkPending || isSinglePending;

  useKeyboardShortcut("a", handleApprove, {
    enabled: showModal,
    ...(bulkApprovePayload?.keyboardShortcutOptions ?? { modal: true }),
  });

  const groupLabel =
    partners.length === 1 ? "Assign to group" : "Assign all to group";

  return (
    <Modal
      showModal={showModal}
      setShowModal={(open) => {
        if (!open) setBulkApprovePayload(null);
      }}
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
          <div className="rounded-lg border border-neutral-200 bg-neutral-100 p-3">
            <div className="flex items-center gap-4">
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
              {partners.length} {pluralize("partner", partners.length)} selected
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-neutral-900">
              {groupLabel}{" "}
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
          onClick={() => setBulkApprovePayload(null)}
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
          disabled={isPending}
        />
        <Button
          onClick={handleApprove}
          autoFocus
          loading={isPending}
          text="Approve"
          className="h-8 w-fit px-3"
          shortcut="A"
        />
      </div>
    </Modal>
  );
}

export function useBulkApprovePartnersModal() {
  const [bulkApprovePayload, setBulkApprovePayload] =
    useState<BulkApprovePartnersPayload | null>(null);

  const openBulkApprove = useCallback((payload: BulkApprovePartnersPayload) => {
    setBulkApprovePayload(payload);
  }, []);

  const BulkApprovePartnersModalCallback = useCallback(() => {
    return (
      <BulkApprovePartnersModal
        bulkApprovePayload={bulkApprovePayload}
        setBulkApprovePayload={setBulkApprovePayload}
      />
    );
  }, [bulkApprovePayload]);

  return useMemo(
    () => ({
      openBulkApprove,
      BulkApprovePartnersModal: BulkApprovePartnersModalCallback,
    }),
    [openBulkApprove, BulkApprovePartnersModalCallback],
  );
}
