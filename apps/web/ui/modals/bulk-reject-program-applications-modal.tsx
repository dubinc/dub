import { bulkRejectProgramApplicationsAction } from "@/lib/actions/partners/bulk-reject-program-applications";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { PartnerProps } from "@/lib/types";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { Button, Modal } from "@dub/ui";
import { cn, pluralize } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { PartnerEmailNotificationTooltipHelper } from "../shared/partner-email-notification-tooltip-helper";

function BulkRejectProgramApplicationsModal({
  showBulkRejectProgramApplicationsModal,
  setShowBulkRejectProgramApplicationsModal,
  partners,
}: {
  showBulkRejectProgramApplicationsModal: boolean;
  setShowBulkRejectProgramApplicationsModal: Dispatch<SetStateAction<boolean>>;
  partners: Pick<PartnerProps, "id" | "name" | "email" | "image">[];
}) {
  const { id: workspaceId } = useWorkspace();

  const { executeAsync, isPending } = useAction(
    bulkRejectProgramApplicationsAction,
    {
      onSuccess: async ({ data }) => {
        setShowBulkRejectProgramApplicationsModal(false);
        await mutatePrefix([
          "/api/partners",
          "/api/partners/count",
          "/api/program-applications",
        ]);
        const { rejectedCount, skippedCount } = data;
        toast.success(
          `${rejectedCount} ${pluralize("partner", rejectedCount)} rejected.${skippedCount > 0 ? ` ${skippedCount} skipped because ${pluralize("it was", skippedCount, { plural: "they were" })} already reviewed.` : ""}`,
        );
      },
      onError({ error }) {
        toast.error(error.serverError);
      },
    },
  );

  const handleBulkReject = async () => {
    const partnerIds = partners.map((p) => p.id);

    if (!workspaceId || partnerIds.length === 0) {
      return;
    }

    await executeAsync({
      workspaceId,
      partnerIds,
    });
  };

  const handleClose = useCallback(() => {
    setShowBulkRejectProgramApplicationsModal(false);
  }, [setShowBulkRejectProgramApplicationsModal]);

  return (
    <Modal
      showModal={showBulkRejectProgramApplicationsModal}
      setShowModal={setShowBulkRejectProgramApplicationsModal}
      onClose={handleClose}
    >
      <div className="space-y-1 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-semibold leading-none">
          Reject {pluralize("application", partners.length)}
        </h3>

        <p className="text-content-subtle text-base font-medium">
          Are you sure you want to reject{" "}
          {pluralize("this application", partners.length, {
            plural: "these applications",
          })}
          ? They will be <PartnerEmailNotificationTooltipHelper />.
        </p>
      </div>

      <div className="space-y-6 bg-neutral-50 p-4 sm:p-6">
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

        <p className="text-sm text-neutral-600">
          This will reject the partner{" "}
          {pluralize("application", partners.length)} and prevent them from
          joining your program.
        </p>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
        <Button
          onClick={handleClose}
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
        />
        <Button
          onClick={handleBulkReject}
          autoFocus
          loading={isPending}
          text="Reject"
          className="h-8 w-fit px-3"
        />
      </div>
    </Modal>
  );
}

export function useBulkRejectProgramApplicationsModal({
  partners,
}: {
  partners: Pick<PartnerProps, "id" | "name" | "email" | "image">[];
}) {
  const [
    showBulkRejectProgramApplicationsModal,
    setShowBulkRejectProgramApplicationsModal,
  ] = useState(false);

  const BulkRejectProgramApplicationsModalCallback = useCallback(() => {
    return (
      <BulkRejectProgramApplicationsModal
        showBulkRejectProgramApplicationsModal={
          showBulkRejectProgramApplicationsModal
        }
        setShowBulkRejectProgramApplicationsModal={
          setShowBulkRejectProgramApplicationsModal
        }
        partners={partners}
      />
    );
  }, [
    showBulkRejectProgramApplicationsModal,
    setShowBulkRejectProgramApplicationsModal,
    partners,
  ]);

  return useMemo(
    () => ({
      setShowBulkRejectProgramApplicationsModal,
      BulkRejectProgramApplicationsModal:
        BulkRejectProgramApplicationsModalCallback,
    }),
    [
      setShowBulkRejectProgramApplicationsModal,
      BulkRejectProgramApplicationsModalCallback,
    ],
  );
}
