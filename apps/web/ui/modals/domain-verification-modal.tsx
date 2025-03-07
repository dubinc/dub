import { Button, Modal } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";

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
  return (
    <>
      <div className="space-y-2 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Verify your domain</h3>
      </div>

      <div className="bg-neutral-50 p-4 sm:p-6">
        <p className="text-sm text-neutral-800">
          To verify your domain {domain}, set the following TXT record on your
          DNS provider:
        </p>

        <div className="mt-4 flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-3">
          <div className="flex items-center justify-between space-x-3 border-b border-neutral-200 pb-2">
            <div className="text-sm text-neutral-500">Type</div>
            <div className="font-mono text-sm">TXT</div>
          </div>
          <div className="flex items-center justify-between space-x-3 border-b border-neutral-200 pb-2">
            <div className="text-sm text-neutral-500">Name</div>
            <div className="font-mono text-sm">@</div>
          </div>
          <div className="flex items-center justify-between space-x-3">
            <div className="text-sm text-neutral-500">Value</div>
            <div className="font-mono text-sm">{txtRecord}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
        <Button
          onClick={() => setShowDomainVerificationModal(false)}
          text="Close"
          className="h-8 w-fit px-3"
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
