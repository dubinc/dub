"use client";

import { MergePartnerAccountsFormProvider } from "@/ui/partners/merge-accounts/form-context";
import { MergeAccountForm } from "@/ui/partners/merge-accounts/merge-account-form";
import { SendVerificationCodeForm } from "@/ui/partners/merge-accounts/send-verification-code-form";
import { VerifyCodeForm } from "@/ui/partners/merge-accounts/verify-code-form";
import { InfoTooltip, Modal, SimpleTooltipContent } from "@dub/ui";
import { AnimatePresence, motion } from "framer-motion";
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

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

const stepTransition = {
  x: {
    type: "spring",
    stiffness: 200,
    damping: 25,
    duration: 0.6,
  },
  opacity: {
    duration: 0.4,
    ease: "easeInOut",
  },
};

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
      <div className="flex items-center gap-2 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Merge accounts</h3>
        <InfoTooltip
          content={
            <SimpleTooltipContent
              title="Learn how to merge one of your partner accounts with another, to keep things organized and better managed."
              cta="Learn more"
              href="https://dub.co/help/article/merging-partner-accounts"
            />
          }
        />
      </div>

      <div className="flex flex-col gap-2 bg-neutral-50 p-4 sm:p-6">
        <MergePartnerAccountsFormProvider>
          <div className="relative overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              {step === 1 && (
                <motion.div
                  key="step-1"
                  custom={1}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={stepTransition}
                  className="relative"
                >
                  <SendVerificationCodeForm
                    onSuccess={() => setStep(2)}
                    onCancel={() => setShowMergePartnerAccountsModal(false)}
                  />
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step-2"
                  custom={1}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={stepTransition}
                  className="relative"
                >
                  <VerifyCodeForm
                    onSuccess={() => setStep(3)}
                    onCancel={() => setShowMergePartnerAccountsModal(false)}
                  />
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step-3"
                  custom={1}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={stepTransition}
                  className="relative"
                >
                  <MergeAccountForm
                    onSuccess={() => {
                      setShowMergePartnerAccountsModal(false);
                    }}
                    onCancel={() => setShowMergePartnerAccountsModal(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </MergePartnerAccountsFormProvider>
      </div>
    </div>
  );
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
