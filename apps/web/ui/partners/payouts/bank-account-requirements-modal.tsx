"use client";

import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { Button, Modal } from "@dub/ui";
import { COUNTRIES, COUNTRY_CURRENCY_CODES } from "@dub/utils";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { Callout } from "../../shared/callout";
import { Markdown } from "../../shared/markdown";

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

  const PAYOUT_GUIDELINES = useMemo(() => {
    return [
      `1. Bank account must be in your local currency.${partner?.country ? ` Since you're based in [${COUNTRIES[partner.country]}](https://partners.dub.co/profile), you need to connect a **${COUNTRY_CURRENCY_CODES[partner.country]} bank account** to receive payouts.` : ""}`,
      "2. Please enter accurate bank account details (no typos or missing numbers).",
      `3. For Stripe's **"Website"** requirement, provide your personal website, or a social media profile if you don't have one – _**not**_ the program's website.`,
    ];
  }, [partner?.country]);

  const [acknowledged, setAcknowledged] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="flex items-center justify-between p-6">
        <h3 className="text-lg font-semibold text-neutral-900">
          Payout guidelines
        </h3>
      </div>

      <div className="flex flex-col gap-4 border-t border-neutral-200 bg-neutral-50 p-6">
        <Callout variant="warn" size={2}>
          If you do not follow these guidelines, payouts may be delayed or
          rejected.
        </Callout>

        <div className="flex flex-col gap-2 text-sm text-neutral-800">
          <p className="font-semibold">Guidelines:</p>
          <Markdown className="list-decimal">
            {PAYOUT_GUIDELINES.join("\n")}
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
              I confirm that I have read the guidelines above, and any payout
              failures will be my sole responsibility.
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
              ? "You must acknowledge the guidelines before continuing."
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
