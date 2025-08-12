import { bulkApprovePartnersAction } from "@/lib/actions/partners/bulk-approve-partners";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { GroupSelector } from "@/ui/partners/groups/group-selector";
import { AnimatedSizeContainer, Button, Modal } from "@dub/ui";
import { OG_AVATAR_URL, pluralize } from "@dub/utils";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

function BulkApprovePartnersModal({
  showBulkApprovePartnersModal,
  setShowBulkApprovePartnersModal,
  partners,
}: {
  showBulkApprovePartnersModal: boolean;
  setShowBulkApprovePartnersModal: Dispatch<SetStateAction<boolean>>;
  partners: EnrolledPartnerProps[];
}) {
  const { id: workspaceId } = useWorkspace();

  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const { executeAsync, isPending } = useAction(bulkApprovePartnersAction, {
    onSuccess: async () => {
      setShowBulkApprovePartnersModal(false);
      await mutatePrefix("/api/partners");
      toast.success(`${pluralize("Partner", partners.length)} approved.`);
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  const handleBulkApprove = async () => {
    const partnerIds = partners.map((p) => p.id);

    if (!workspaceId || partnerIds.length === 0) {
      return;
    }

    await executeAsync({
      workspaceId,
      partnerIds,
      groupId: selectedGroupId,
    });
  };

  return (
    <Modal
      showModal={showBulkApprovePartnersModal}
      setShowModal={setShowBulkApprovePartnersModal}
    >
      <div className="space-y-1 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-semibold leading-none">
          Approve {pluralize("application", partners.length)}
        </h3>

        <p className="text-content-subtle text-base font-medium">
          Are you sure you want to approve these applications?
        </p>
      </div>

      <div className="space-y-6 bg-neutral-50 p-4 sm:p-6">
        <div className="flex items-center space-x-3 rounded-lg border border-neutral-200 bg-neutral-100 p-3">
          <div className="flex -space-x-1">
            {partners.slice(0, 3).map((partner, index) => (
              <img
                key={partner.id}
                src={partner.image || `${OG_AVATAR_URL}${partner.name}`}
                alt={partner.name}
                className="inline-block size-6 rounded-full outline -outline-offset-1 outline-white ring-2 ring-white ring-offset-0"
                style={{ zIndex: 3 - index }}
              />
            ))}
          </div>
          <span className="text-base font-semibold text-neutral-900">
            {partners.length} {pluralize("partner", partners.length)} selected
          </span>
        </div>

        <div>
          <button
            type="button"
            className="flex w-full items-center gap-2"
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          >
            <p className="text-sm text-neutral-600">
              {showAdvancedOptions ? "Hide" : "Show"} advanced settings
            </p>
            <motion.div
              animate={{ rotate: showAdvancedOptions ? 180 : 0 }}
              className="text-neutral-600"
            >
              <ChevronDown className="size-4" />
            </motion.div>
          </button>

          <div className="-m-1">
            <AnimatedSizeContainer height>
              <div className="p-1">
                {showAdvancedOptions && (
                  <div className="grid grid-cols-1 gap-6 pt-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-900">
                        Assign all to group{" "}
                        <span className="text-neutral-500">(optional)</span>
                      </label>

                      <div className="relative mt-2 rounded-md shadow-sm">
                        <GroupSelector
                          selectedGroupId={selectedGroupId}
                          setSelectedGroupId={setSelectedGroupId}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </AnimatedSizeContainer>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
        <Button
          onClick={() => setShowBulkApprovePartnersModal(false)}
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
        />
        <Button
          onClick={handleBulkApprove}
          autoFocus
          loading={isPending}
          text="Approve"
          className="h-8 w-fit px-3"
        />
      </div>
    </Modal>
  );
}

export function useBulkApprovePartnersModal({
  partners,
}: {
  partners: EnrolledPartnerProps[];
}) {
  const [showBulkApprovePartnersModal, setShowBulkApprovePartnersModal] =
    useState(false);

  const BulkApprovePartnersModalCallback = useCallback(() => {
    return (
      <BulkApprovePartnersModal
        showBulkApprovePartnersModal={showBulkApprovePartnersModal}
        setShowBulkApprovePartnersModal={setShowBulkApprovePartnersModal}
        partners={partners}
      />
    );
  }, [showBulkApprovePartnersModal, setShowBulkApprovePartnersModal, partners]);

  return useMemo(
    () => ({
      setShowBulkApprovePartnersModal,
      BulkApprovePartnersModal: BulkApprovePartnersModalCallback,
    }),
    [setShowBulkApprovePartnersModal, BulkApprovePartnersModalCallback],
  );
}
