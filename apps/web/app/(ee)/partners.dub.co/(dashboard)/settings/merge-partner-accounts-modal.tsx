"use client";

import { MergePartnerAccountsFormProvider } from "@/ui/partners/merge-accounts/form-context";
import { SendVerificationCodeForm } from "@/ui/partners/merge-accounts/send-verification-code-form";
import { VerifyCodeForm } from "@/ui/partners/merge-accounts/verify-code-form";
import { Modal } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";

interface MergePartnerAccountsModalProps {
  showMergePartnerAccountsModal: boolean;
  setShowMergePartnerAccountsModal: Dispatch<SetStateAction<boolean>>;
}

function MergePartnerAccountsModal(props: MergePartnerAccountsModalProps) {
  const { showMergePartnerAccountsModal, setShowMergePartnerAccountsModal } =
    props;

  return (
    <Modal
      showModal={showMergePartnerAccountsModal}
      setShowModal={setShowMergePartnerAccountsModal}
    >
      <MergePartnerAccountsModalInner {...props} />
    </Modal>
  );
}

function MergePartnerAccountsModalInner({
  setShowMergePartnerAccountsModal,
}: MergePartnerAccountsModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  return (
    <div>
      <div className="border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Merge accounts</h3>
      </div>

      <div className="flex flex-col gap-2 bg-neutral-50 p-4 sm:p-6">
        <MergePartnerAccountsFormProvider>
          {step === 1 && (
            <SendVerificationCodeForm setStep={() => setStep(2)} />
          )}

          {step === 2 && <VerifyCodeForm setStep={() => setStep(3)} />}

          {step === 3 && <MergeAccountsForm />}
        </MergePartnerAccountsFormProvider>
      </div>
    </div>
  );
}

// Step 3: Merge accounts
function MergeAccountsForm() {
  return <div>MergeAccounts</div>;
}

export function useMergePartnerAccountsModal() {
  const [showMergePartnerAccountsModal, setShowMergePartnerAccountsModal] =
    useState(false);

  const MergePartnerAccountsModalCallback = useCallback(() => {
    return (
      <MergePartnerAccountsModal
        showMergePartnerAccountsModal={showMergePartnerAccountsModal}
        setShowMergePartnerAccountsModal={setShowMergePartnerAccountsModal}
      />
    );
  }, [showMergePartnerAccountsModal, setShowMergePartnerAccountsModal]);

  return useMemo(
    () => ({
      setShowMergePartnerAccountsModal,
      MergePartnerAccountsModal: MergePartnerAccountsModalCallback,
    }),
    [setShowMergePartnerAccountsModal, MergePartnerAccountsModalCallback],
  );
}
