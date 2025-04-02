import { verifyDomainAction } from "@/lib/actions/partners/verify-domain";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { Button, CopyButton, Modal } from "@dub/ui";
import { X } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

interface DomainVerificationModalProps {
  showDomainVerificationModal: boolean;
  setShowDomainVerificationModal: Dispatch<SetStateAction<boolean>>;
  domain: string;
  txtRecord: string;
}

export function DomainVerificationModal(props: DomainVerificationModalProps) {
  return (
    <Modal
      showModal={props.showDomainVerificationModal}
      setShowModal={props.setShowDomainVerificationModal}
    >
      <DomainVerificationModalInner {...props} />
    </Modal>
  );
}

function DomainVerificationModalInner({
  setShowDomainVerificationModal,
  domain,
  txtRecord,
}: DomainVerificationModalProps) {
  const { partner, mutate: mutatePartner } = usePartnerProfile();

  const { executeAsync, status } = useAction(verifyDomainAction, {
    onError: ({ error }) => {
      console.warn("Failed to verify domain", error.serverError);
    },
  });

  return (
    <>
      <div className="flex items-center justify-between border-b border-neutral-200 p-4 sm:px-6">
        <h3 className="text-lg font-medium leading-none">Verify your domain</h3>
        <button
          type="button"
          onClick={() => setShowDomainVerificationModal(false)}
          className="group rounded-full p-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none active:bg-neutral-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="bg-neutral-50 p-4 sm:p-6">
        <p className="text-sm text-neutral-800">
          To verify your domain {domain}, set the following TXT record on your
          DNS provider:
        </p>

        <div className="mt-4 flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 text-sm text-neutral-600">
          <div className="flex justify-between gap-12">
            <div className="font-medium text-neutral-800">Type</div>
            <div className="font-mono">TXT</div>
          </div>
          <div className="flex justify-between gap-12">
            <div className="font-medium text-neutral-800">Name</div>
            <div className="font-mono">@</div>
          </div>
          <div className="flex justify-between gap-12">
            <div className="font-medium text-neutral-800">Value</div>
            <div className="flex min-w-0 items-center gap-2" title={txtRecord}>
              <span className="min-w-0 truncate font-mono">{txtRecord}</span>
              <CopyButton value={txtRecord} className="-m-1.5" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-neutral-200 px-4 py-4 sm:px-6">
        <Button
          text="Verify"
          className="h-8 w-fit px-3"
          loading={status === "executing" || status === "hasSucceeded"}
          onClick={async () => {
            const result = await executeAsync();

            if (!result?.data?.success || !result.data.websiteVerifiedAt) {
              toast.error(`Failed to verify domain: ${result?.serverError}`);
              return;
            }

            toast.success("Domain verified successfully!");
            if (partner)
              mutatePartner({
                ...partner,
                websiteVerifiedAt: new Date(result.data.websiteVerifiedAt),
              });
            setShowDomainVerificationModal(false);
          }}
        />
      </div>
    </>
  );
}

export function useDomainVerificationModal({
  domain,
  txtRecord,
}: {
  domain: string;
  txtRecord: string;
}) {
  const [showDomainVerificationModal, setShowDomainVerificationModal] =
    useState(false);

  const DomainVerificationModalCallback = useCallback(() => {
    return (
      <DomainVerificationModal
        showDomainVerificationModal={showDomainVerificationModal}
        setShowDomainVerificationModal={setShowDomainVerificationModal}
        domain={domain}
        txtRecord={txtRecord}
      />
    );
  }, [
    showDomainVerificationModal,
    setShowDomainVerificationModal,
    domain,
    txtRecord,
  ]);

  return useMemo(
    () => ({
      setShowDomainVerificationModal,
      DomainVerificationModal: DomainVerificationModalCallback,
    }),
    [setShowDomainVerificationModal, DomainVerificationModalCallback],
  );
}
