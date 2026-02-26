"use client";

import { Button, Modal } from "@dub/ui";
import { useCallback, useRef, useState } from "react";

export function useCountryChangeWarningModal() {
  const [showModalState, setShowModalState] = useState(false);
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const onAcknowledgeRef = useRef<(() => void) | null>(null);

  const handleCancel = useCallback(() => {
    onAcknowledgeRef.current = null;
    setShowModalState(false);
  }, []);

  const handleAcknowledge = useCallback(() => {
    setIsAcknowledged(true);
    setShowModalState(false);
    onAcknowledgeRef.current?.();
    onAcknowledgeRef.current = null;
  }, []);

  const modal = (
    <Modal
      showModal={showModalState}
      setShowModal={setShowModalState}
      onClose={handleCancel}
    >
      <div className="border-border-subtle bg-white border-b p-5 text-left">
        <h3 className="text-content-emphasis text-base font-semibold">
          Updating your country
        </h3>
      </div>

      <div className="text-content-subtle bg-neutral-50 p-5 text-sm">
        <p>
          You must select the country where you legally reside for tax
          purposes. Providing incorrect information may result in account
          suspension, loss of payouts, and legal action.
        </p>
        <p className="mt-4">
          Dub is not responsible for legal or tax consequences resulting from
          misrepresentation.
        </p>
      </div>

      <div className="border-border-subtle bg-neutral-50 flex items-center justify-end gap-2 border-t px-5 py-4">
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

  const showModal = useCallback(() => {
    onAcknowledgeRef.current = null;
    setShowModalState(true);
  }, []);

  const acknowledgeAndContinue = useCallback(
    (callback?: () => void) => {
      onAcknowledgeRef.current = callback ?? null;
      setShowModalState(true);
    },
    [],
  );

  return {
    modal,
    showModal,
    isAcknowledged,
    acknowledgeAndContinue,
  };
}
