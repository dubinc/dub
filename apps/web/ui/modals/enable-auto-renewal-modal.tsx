import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { DomainProps } from "@/lib/types";
import { Button, Modal } from "@dub/ui";
import { Globe } from "@dub/ui/icons";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

function EnableAutoRenewalModal({
  showEnableAutoRenewalModal,
  setShowEnableAutoRenewalModal,
  domain,
}: {
  showEnableAutoRenewalModal: boolean;
  setShowEnableAutoRenewalModal: Dispatch<SetStateAction<boolean>>;
  domain: DomainProps;
}) {
  const { id: workspaceId } = useWorkspace();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const enableAutoRenewal = useCallback(async () => {
    if (!workspaceId || !domain.slug) {
      return;
    }

    setIsSubmitting(true);

    const response = await fetch(
      `/api/domains/${domain.slug}?workspaceId=${workspaceId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          autoRenew: true,
        }),
      },
    );

    if (response.ok) {
      await mutatePrefix("/api/domains");
      toast.success("Auto-renewal status updated!");
    } else {
      toast.error("Failed to update auto-renewal status");
    }

    setIsSubmitting(false);
    setShowEnableAutoRenewalModal(false);
  }, [workspaceId, domain.slug, setShowEnableAutoRenewalModal]);

  return (
    <Modal
      showModal={showEnableAutoRenewalModal}
      setShowModal={setShowEnableAutoRenewalModal}
    >
      <div className="space-y-2 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">
          Enable auto-renewal
        </h3>
      </div>

      <div className="bg-neutral-50 p-4 sm:p-6">
        <p className="text-sm text-neutral-800">
          This domain will renew each year for $12.
        </p>

        <div className="scrollbar-hide mt-4 flex max-h-[190px] flex-col gap-2 overflow-y-auto p-2">
          <div className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-3">
            <div className="hidden rounded-full border border-neutral-200 sm:block">
              <div className="rounded-full border border-white bg-gradient-to-t from-neutral-100 p-1 md:p-2">
                <Globe className="size-5" />
              </div>
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5 sm:gap-2.5">
                <span className="truncate text-sm font-medium">
                  {domain.slug}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
        <Button
          onClick={() => setShowEnableAutoRenewalModal(false)}
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
        />
        <Button
          onClick={enableAutoRenewal}
          autoFocus
          loading={isSubmitting}
          text="Confirm"
          className="h-8 w-fit px-3"
        />
      </div>
    </Modal>
  );
}

export function useEnableAutoRenewalModal({ domain }: { domain: DomainProps }) {
  const [showEnableAutoRenewalModal, setShowEnableAutoRenewalModal] =
    useState(false);

  const EnableAutoRenewalModalCallback = useCallback(() => {
    return (
      <EnableAutoRenewalModal
        showEnableAutoRenewalModal={showEnableAutoRenewalModal}
        setShowEnableAutoRenewalModal={setShowEnableAutoRenewalModal}
        domain={domain}
      />
    );
  }, [showEnableAutoRenewalModal, setShowEnableAutoRenewalModal, domain]);

  return useMemo(
    () => ({
      setShowEnableAutoRenewalModal,
      EnableAutoRenewalModal: EnableAutoRenewalModalCallback,
    }),
    [setShowEnableAutoRenewalModal, EnableAutoRenewalModalCallback],
  );
}
