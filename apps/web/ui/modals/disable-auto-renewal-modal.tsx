import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { DomainProps } from "@/lib/types";
import { Button, Modal } from "@dub/ui";
import { Globe } from "@dub/ui/icons";
import { formatDate } from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

function DisableAutoRenewalModal({
  showDisableAutoRenewalModal,
  setShowDisableAutoRenewalModal,
  domain,
}: {
  showDisableAutoRenewalModal: boolean;
  setShowDisableAutoRenewalModal: Dispatch<SetStateAction<boolean>>;
  domain: DomainProps;
}) {
  const { id: workspaceId } = useWorkspace();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const disableAutoRenewal = useCallback(async () => {
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
          autoRenew: false,
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
    setShowDisableAutoRenewalModal(false);
  }, [workspaceId, domain.slug, setShowDisableAutoRenewalModal]);

  return (
    <Modal
      showModal={showDisableAutoRenewalModal}
      setShowModal={setShowDisableAutoRenewalModal}
    >
      <div className="space-y-2 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">
          Disable auto-renewal
        </h3>
      </div>

      <div className="bg-neutral-50 p-4 sm:p-6">
        <p className="text-sm text-neutral-800">
          By disabling auto-renewal, your domain <strong>{domain.slug}</strong>{" "}
          will expire on{" "}
          <strong>{formatDate(domain.registeredDomain?.expiresAt!)}</strong>.
          <br />
          <br />
          Once your domain expires, there is no guarantee that you’ll be able to
          get it back. Please proceed with caution.
        </p>

        <div className="scrollbar-hide mt-4 flex max-h-[190px] flex-col gap-2 overflow-y-auto">
          <div className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-3">
            <div className="hidden rounded-full border border-neutral-200 sm:block">
              <div className="rounded-full border border-white bg-gradient-to-t from-neutral-100 p-1 md:p-2">
                <Globe className="size-5" />
              </div>
            </div>
            <span className="truncate text-sm font-medium">{domain.slug}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
        <Button
          onClick={() => setShowDisableAutoRenewalModal(false)}
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
        />
        <Button
          onClick={disableAutoRenewal}
          autoFocus
          loading={isSubmitting}
          text="Disable auto-renewal"
          className="h-8 w-fit px-3"
        />
      </div>
    </Modal>
  );
}

export function useDisableAutoRenewalModal({
  domain,
}: {
  domain: DomainProps;
}) {
  const [showDisableAutoRenewalModal, setShowDisableAutoRenewalModal] =
    useState(false);

  const DisableAutoRenewalModalCallback = useCallback(() => {
    return (
      <DisableAutoRenewalModal
        showDisableAutoRenewalModal={showDisableAutoRenewalModal}
        setShowDisableAutoRenewalModal={setShowDisableAutoRenewalModal}
        domain={domain}
      />
    );
  }, [showDisableAutoRenewalModal, setShowDisableAutoRenewalModal, domain]);

  return useMemo(
    () => ({
      setShowDisableAutoRenewalModal,
      DisableAutoRenewalModal: DisableAutoRenewalModalCallback,
    }),
    [setShowDisableAutoRenewalModal, DisableAutoRenewalModalCallback],
  );
}
