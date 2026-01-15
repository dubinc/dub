"use client";

import { X } from "@/ui/shared/icons";
import { Button, Modal } from "@dub/ui";
import { TriangleWarning } from "@dub/ui/icons";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";

const BANK_ACCOUNT_REQUIREMENTS = [
  "Bank account must be in your local currency",
  "Must be a checking account (not a savings account or debit card)",
  "Double check bank account information because payouts cannot be reversed once sent",
  "The bank account name must match your partner account name",
];

function BankAccountRequirementsModal({
  showModal,
  setShowModal,
  onContinue,
}: {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  onContinue: () => void;
}) {
  const [acknowledged, setAcknowledged] = useState(false);

  const handleContinue = useCallback(() => {
    onContinue();
  }, [onContinue]);

  const handleClose = useCallback(() => {
    setShowModal(false);
    setAcknowledged(false);
  }, [setShowModal]);

  return (
    <Modal showModal={showModal} setShowModal={handleClose}>
      <div className="flex items-center justify-between p-6">
        <h3 className="text-lg font-semibold text-neutral-900">
          Bank account requirements
        </h3>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex flex-col gap-6 border-t border-neutral-200 bg-neutral-50 p-6">
        <div className="flex flex-col gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <TriangleWarning className="size-3.5 text-amber-500" />
          <p className="text-sm leading-5 text-amber-900">
            If your bank account does not meet these requirements, payouts may
            be delayed and cannot be fixed automatically.
            <br />
            <br />
            Support will be required to resolve.
          </p>
        </div>

        <div className="flex flex-col gap-2 text-sm text-neutral-800">
          <p className="font-semibold">What your bank account must support:</p>
          <ol className="list-decimal space-y-0.5 pl-5">
            {BANK_ACCOUNT_REQUIREMENTS.map((requirement, index) => (
              <li key={index} className="leading-5">
                {requirement}
              </li>
            ))}
          </ol>
        </div>

        <label className="flex cursor-pointer gap-2.5 rounded-lg border border-neutral-300 px-2.5 py-2">
          <div className="flex h-5 items-center">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
            />
          </div>
          <span className="text-sm leading-5 text-neutral-900">
            I understand these requirements and confirm my bank account meets
            them.
          </span>
        </label>

        <Button
          text="Continue"
          onClick={handleContinue}
          disabled={!acknowledged}
          disabledTooltip={
            !acknowledged
              ? "You must acknowledge the requirements before continuing."
              : undefined
          }
        />
      </div>
    </Modal>
  );
}

export function useBankAccountRequirementsModal({
  onContinue,
}: {
  onContinue: () => void;
}) {
  const [showModal, setShowModal] = useState(false);

  const BankAccountRequirementsModalElement = useMemo(
    () => (
      <BankAccountRequirementsModal
        showModal={showModal}
        setShowModal={setShowModal}
        onContinue={onContinue}
      />
    ),
    [showModal, onContinue],
  );

  return useMemo(
    () => ({
      setShowBankAccountRequirementsModal: setShowModal,
      BankAccountRequirementsModal: BankAccountRequirementsModalElement,
    }),
    [BankAccountRequirementsModalElement],
  );
}
