import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { DomainProps } from "@/lib/types";
import { Button, Modal } from "@dub/ui";
import { Globe } from "@dub/ui/icons";
import { currencyFormatter, formatDate } from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

function DomainAutoRenewalModal({
  showDomainAutoRenewalModal,
  setShowDomainAutoRenewalModal,
  domain,
  enableAutoRenewal,
}: {
  showDomainAutoRenewalModal: boolean;
  setShowDomainAutoRenewalModal: Dispatch<SetStateAction<boolean>>;
  domain: DomainProps;
  enableAutoRenewal: boolean;
}) {
  const { id: workspaceId } = useWorkspace();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateAutoRenewal = useCallback(async () => {
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
          autoRenew: enableAutoRenewal,
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
    setShowDomainAutoRenewalModal(false);
  }, [
    workspaceId,
    domain.slug,
    enableAutoRenewal,
    setShowDomainAutoRenewalModal,
  ]);

  if (!domain.registeredDomain) {
    return null;
  }

  const expiresAt = domain.registeredDomain.expiresAt;
  const renewalFee = domain.registeredDomain.renewalFee;

  return (
    <Modal
      showModal={showDomainAutoRenewalModal}
      setShowModal={setShowDomainAutoRenewalModal}
    >
      <div className="space-y-2 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">
          {enableAutoRenewal ? "Enable" : "Disable"} auto-renewal
        </h3>
      </div>

      <div className="bg-neutral-50 p-4 sm:p-6">
        <p className="text-sm text-neutral-800">
          {enableAutoRenewal ? (
            <>
              Your domain is currently set to expire on{" "}
              <strong>{formatDate(expiresAt)}</strong>. By enabling
              auto-renewal, Dub will automatically renew your domain for{" "}
              <strong>{currencyFormatter(renewalFee)}</strong>.
            </>
          ) : (
            <>
              Dub will automatically renew your domain for{" "}
              <strong>{currencyFormatter(renewalFee)}</strong>. By disabling
              auto-renewal, your domain <strong>{domain.slug}</strong> will
              expire on <strong>{formatDate(expiresAt)}</strong>.
              <br />
              <br />
              Once your domain expires, there is no guarantee that you'll be
              able to get it back. Please proceed with caution.
            </>
          )}
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
          onClick={() => setShowDomainAutoRenewalModal(false)}
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
        />
        <Button
          onClick={updateAutoRenewal}
          autoFocus
          loading={isSubmitting}
          text={`${enableAutoRenewal ? "Enable" : "Disable"} auto-renewal`}
          className="h-8 w-fit px-3"
        />
      </div>
    </Modal>
  );
}

export function useDomainAutoRenewalModal({ domain }: { domain: DomainProps }) {
  const [showDomainAutoRenewalModal, setShowDomainAutoRenewalModal] =
    useState(false);
  const [enableAutoRenewal, setEnableAutoRenewal] = useState(false);

  const DomainAutoRenewalModalCallback = useCallback(() => {
    return (
      <DomainAutoRenewalModal
        showDomainAutoRenewalModal={showDomainAutoRenewalModal}
        setShowDomainAutoRenewalModal={setShowDomainAutoRenewalModal}
        domain={domain}
        enableAutoRenewal={enableAutoRenewal}
      />
    );
  }, [
    showDomainAutoRenewalModal,
    setShowDomainAutoRenewalModal,
    domain,
    enableAutoRenewal,
  ]);

  const openDomainRenewalModal = useCallback((enable: boolean) => {
    setEnableAutoRenewal(enable);
    setShowDomainAutoRenewalModal(true);
  }, []);

  return useMemo(
    () => ({
      openDomainRenewalModal,
      DomainAutoRenewalModal: DomainAutoRenewalModalCallback,
    }),
    [openDomainRenewalModal, DomainAutoRenewalModalCallback],
  );
}
