import { bulkArchivePartnersAction } from "@/lib/actions/partners/bulk-archive-partners";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { Button, Modal } from "@dub/ui";
import { cn, OG_AVATAR_URL, pluralize } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

interface BulkArchivePartnersProps {
  showBulkArchivePartnersModal: boolean;
  setShowBulkArchivePartnersModal: Dispatch<SetStateAction<boolean>>;
  partners: Pick<EnrolledPartnerProps, "id" | "name" | "image" | "email">[];
  onConfirm?: () => Promise<void>;
}

function BulkArchivePartnersModal({
  showBulkArchivePartnersModal,
  setShowBulkArchivePartnersModal,
  partners,
  onConfirm,
}: BulkArchivePartnersProps) {
  const { id: workspaceId } = useWorkspace();

  const partnerWord = pluralize("partner", partners.length);

  const { executeAsync, isPending } = useAction(bulkArchivePartnersAction, {
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  const handleArchive = useCallback(async () => {
    if (!workspaceId || partners.length === 0) {
      return;
    }

    const result = await executeAsync({
      workspaceId,
      partnerIds: partners.map((p) => p.id),
    });

    if (result?.serverError) {
      return;
    }

    setShowBulkArchivePartnersModal(false);
    await onConfirm?.();
    toast.success(`${partners.length} ${partnerWord} archived successfully!`);
  }, [
    executeAsync,
    partners,
    workspaceId,
    setShowBulkArchivePartnersModal,
    onConfirm,
    partnerWord,
  ]);

  const isDisabled = useMemo(() => {
    return !workspaceId || partners.length === 0;
  }, [workspaceId, partners.length]);

  return (
    <Modal
      showModal={showBulkArchivePartnersModal}
      setShowModal={setShowBulkArchivePartnersModal}
    >
      <div className="border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">
          Archive {partnerWord}
        </h3>
      </div>

      <div className="flex flex-col gap-6 bg-neutral-50 p-4 sm:p-6">
        <div className="rounded-lg border border-neutral-200 bg-neutral-100 p-3">
          {partners.length === 1 ? (
            <div className="flex items-center gap-4">
              <img
                src={partners[0].image || `${OG_AVATAR_URL}${partners[0].name}`}
                alt={partners[0].name}
                className="size-10 rounded-full bg-white"
              />
              <div className="flex min-w-0 flex-col">
                <h4 className="truncate text-sm font-medium text-neutral-900">
                  {partners[0].name}
                </h4>
                {partners[0].email && (
                  <p className="truncate text-xs text-neutral-500">
                    {partners[0].email}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center">
                {partners.slice(0, 3).map((partner, index) => (
                  <img
                    key={partner.id}
                    src={partner.image || `${OG_AVATAR_URL}${partner.id}`}
                    alt={partner.id}
                    className={cn(
                      "inline-block size-7 rounded-full border-2 border-neutral-100 bg-white",
                      index > 0 && "-ml-2.5",
                    )}
                  />
                ))}
              </div>
              <span className="text-base font-semibold text-neutral-900">
                {partners.length} partners selected
              </span>
            </div>
          )}
        </div>

        <p className="text-sm text-neutral-600">
          This will hide the {partnerWord} from your partners list. All their
          links will still work, and they will still earn commissions.
        </p>
      </div>

      <div className="flex items-center justify-end gap-2 bg-neutral-50 px-4 pb-5 sm:px-6">
        <Button
          onClick={() => setShowBulkArchivePartnersModal(false)}
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
        />
        <Button
          onClick={handleArchive}
          autoFocus
          disabled={isDisabled}
          loading={isPending}
          text={`Archive ${partnerWord}`}
          className="h-8 w-fit px-3"
        />
      </div>
    </Modal>
  );
}

export function useBulkArchivePartnersModal({
  partners,
  onConfirm,
}: {
  partners: Pick<EnrolledPartnerProps, "id" | "name" | "image" | "email">[];
  onConfirm?: () => Promise<void>;
}) {
  const [showBulkArchivePartnersModal, setShowBulkArchivePartnersModal] =
    useState(false);

  const BulkArchivePartnersModalCallback = useCallback(() => {
    return (
      <BulkArchivePartnersModal
        showBulkArchivePartnersModal={showBulkArchivePartnersModal}
        setShowBulkArchivePartnersModal={setShowBulkArchivePartnersModal}
        partners={partners}
        onConfirm={onConfirm}
      />
    );
  }, [
    showBulkArchivePartnersModal,
    setShowBulkArchivePartnersModal,
    partners,
    onConfirm,
  ]);

  return useMemo(
    () => ({
      setShowBulkArchivePartnersModal,
      BulkArchivePartnersModal: BulkArchivePartnersModalCallback,
    }),
    [setShowBulkArchivePartnersModal, BulkArchivePartnersModalCallback],
  );
}
