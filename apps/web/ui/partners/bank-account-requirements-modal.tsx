"use client";

import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { Button, Modal } from "@dub/ui";
import { TriangleWarning } from "@dub/ui/icons";
import { COUNTRIES, COUNTRY_CURRENCY_CODES } from "@dub/utils";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { Markdown } from "../shared/markdown";

function BankAccountRequirementsModal({
  showModal,
  setShowModal,
  onContinue,
}: {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  onContinue: () => Promise<void>;
}) {
  const { partner } = usePartnerProfile();

  const BANK_ACCOUNT_REQUIREMENTS = useMemo(() => {
    return [
      `1. Bank account must be in your local currency.${partner?.country ? ` Since you're based in [${COUNTRIES[partner.country]}](/profile), you need to connect a **${COUNTRY_CURRENCY_CODES[partner.country]} bank account** to receive payouts.` : ""}`,
      "2. Bank account must be a **checking account** (not a savings account or debit card).",
      "3. Bank account holder name must match your partner account name.",
      "4. Bank account details are 100% accurate (no typos or missing numbers).",
    ];
  }, [partner?.country]);

  const [acknowledged, setAcknowledged] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="flex items-center justify-between p-6">
        <h3 className="text-lg font-semibold text-neutral-900">
          Bank account requirements
        </h3>
      </div>

      <div className="flex flex-col gap-6 border-t border-neutral-200 bg-neutral-50 p-6">
        <div className="flex flex-col gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <TriangleWarning className="size-3.5 text-amber-500" />
          <p className="text-sm leading-5 text-amber-900">
            If your bank account does not meet these requirements, payouts may
            be delayed or rejected.
          </p>
        </div>

        <div className="flex flex-col gap-2 text-sm text-neutral-800">
          <p className="font-semibold">Requirements:</p>
          <Markdown className="list-decimal space-y-1">
            {BANK_ACCOUNT_REQUIREMENTS.join("\n")}
          </Markdown>

          <label className="flex cursor-pointer gap-3 rounded-lg border border-neutral-300 p-3">
            <div className="flex h-5 items-center">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
            </div>
            <span className="text-sm leading-5 text-neutral-900">
              I confirm that my bank account meets all of the above
              requirements.
            </span>
          </label>
        </div>

        <Button
          text="Continue"
          onClick={async () => {
            setIsLoading(true);
            await onContinue();
            setIsLoading(false);
          }}
          loading={isLoading}
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
  onContinue: () => Promise<void>;
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
