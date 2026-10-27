"use client";

import { Button, Modal } from "@dub/ui";
import { useCallback, useRef, useState } from "react";

export function useCountryChangeWarningModal() {
  const [showModalState, setShowModalState] = useState(false);
  const onAcknowledgeRef = useRef<(() => void) | null>(null);
  const onCancelRef = useRef<(() => void) | null>(null);

  const handleCancel = useCallback(() => {
    const onCancel = onCancelRef.current;
    onAcknowledgeRef.current = null;
    onCancelRef.current = null;
    setShowModalState(false);
    onCancel?.();
  }, []);

  const handleAcknowledge = useCallback(() => {
    const onAcknowledge = onAcknowledgeRef.current;
    onAcknowledgeRef.current = null;
    onCancelRef.current = null;
    setShowModalState(false);
    onAcknowledge?.();
  }, []);

  const modal = (
    <Modal
      showModal={showModalState}
      setShowModal={setShowModalState}
      onClose={handleCancel}
    >
      <div className="border-border-subtle border-b bg-white p-5 text-left">
        <h3 className="text-content-emphasis text-base font-semibold">
          Updating your country
        </h3>
      </div>

      <div className="text-content-subtle bg-neutral-50 p-5 text-sm">
        <p>
          You must select the country where you legally reside for tax purposes.
          Providing incorrect information may result in account suspension, loss
          of payouts, and legal action.
        </p>
        <p className="mt-4">
          You can only change your country once, and this removes your connected
          payout method. You'll need to connect it again. To change your country
          later, contact support.
        </p>
        <p className="mt-4">
          Dub is not responsible for legal or tax consequences resulting from
          misrepresentation.
        </p>
      </div>

      <div className="border-border-subtle flex items-center justify-end gap-2 border-t bg-neutral-50 px-5 py-4">
        <Button
          variant="secondary"
          className="h-8 w-fit px-3"
          text="Cancel"
          onClick={handleCancel}
        />
        <Button
          variant="primary"
          className="h-8 w-fit px-3"
          text="I acknowledge"
          onClick={handleAcknowledge}
        />
      </div>
    </Modal>
  );

  const acknowledgeAndContinue = useCallback(
    (callback?: () => void, onCancel?: () => void) => {
      onAcknowledgeRef.current = callback ?? null;
      onCancelRef.current = onCancel ?? null;
      setShowModalState(true);
    },
    [],
  );

  return {
    modal,
    acknowledgeAndContinue,
  };
}
