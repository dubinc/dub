import { bulkRejectPartnerApplicationsAction } from "@/lib/actions/partners/bulk-reject-partner-applications";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { Button, Checkbox, Modal } from "@dub/ui";
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

function BulkRejectPartnersModal({
  showBulkRejectPartnersModal,
  setShowBulkRejectPartnersModal,
  partners,
}: {
  showBulkRejectPartnersModal: boolean;
  setShowBulkRejectPartnersModal: Dispatch<SetStateAction<boolean>>;
  partners: EnrolledPartnerProps[];
}) {
  const { id: workspaceId } = useWorkspace();
  const [reportFraud, setReportFraud] = useState(false);

  const { executeAsync, isPending } = useAction(
    bulkRejectPartnerApplicationsAction,
    {
      onSuccess: async () => {
        setShowBulkRejectPartnersModal(false);
        setReportFraud(false);
        await mutatePrefix(["/api/partners", "/api/partners/count"]);
        toast.success(`${pluralize("Partner", partners.length)} rejected.`);
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
      reportFraud,
    });
  };

  const handleClose = useCallback(() => {
    setShowBulkRejectPartnersModal(false);
    setReportFraud(false);
  }, [setShowBulkRejectPartnersModal]);

  return (
    <Modal
      showModal={showBulkRejectPartnersModal}
      setShowModal={setShowBulkRejectPartnersModal}
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
          ?
        </p>
      </div>

      <div className="space-y-6 bg-neutral-50 p-4 sm:p-6">
        <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-100 p-3">
          <div className="flex items-center">
            {partners.slice(0, 3).map((partner, index) => (
              <img
                key={partner.id}
                src={partner.image || `${OG_AVATAR_URL}${partner.name}`}
                alt={partner.name}
                className={cn(
                  "inline-block size-7 rounded-full border-2 border-neutral-100",
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

        <label className="flex items-start gap-2.5">
          <Checkbox
            className="mt-1 size-4 rounded border-neutral-300 focus:border-neutral-500 focus:ring-neutral-500 focus-visible:border-neutral-500 focus-visible:ring-neutral-500 data-[state=checked]:bg-black data-[state=indeterminate]:bg-black"
            checked={reportFraud}
            onCheckedChange={(checked) => setReportFraud(Boolean(checked))}
          />
          <span className="text-sm text-neutral-600">
            Select this if you believe{" "}
            {pluralize("this application", partners.length, {
              plural: "these applications",
            })}{" "}
            {pluralize("shows", partners.length, { plural: "show" })} signs of
            fraud. This helps keep the network safe.
          </span>
        </label>
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

export function useBulkRejectPartnersModal({
  partners,
}: {
  partners: EnrolledPartnerProps[];
}) {
  const [showBulkRejectPartnersModal, setShowBulkRejectPartnersModal] =
    useState(false);

  const BulkRejectPartnersModalCallback = useCallback(() => {
    return (
      <BulkRejectPartnersModal
        showBulkRejectPartnersModal={showBulkRejectPartnersModal}
        setShowBulkRejectPartnersModal={setShowBulkRejectPartnersModal}
        partners={partners}
      />
    );
  }, [showBulkRejectPartnersModal, setShowBulkRejectPartnersModal, partners]);

  return useMemo(
    () => ({
      setShowBulkRejectPartnersModal,
      BulkRejectPartnersModal: BulkRejectPartnersModalCallback,
    }),
    [setShowBulkRejectPartnersModal, BulkRejectPartnersModalCallback],
  );
}
