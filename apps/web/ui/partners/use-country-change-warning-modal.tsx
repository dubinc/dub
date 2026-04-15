"use client";

import { Button, Modal } from "@dub/ui";
import { useCallback, useEffect, useRef, useState } from "react";

export function useCountryChangeWarningModal() {
  const [showModalState, setShowModalState] = useState(false);
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const [focusAcknowledgeButton, setFocusAcknowledgeButton] = useState(false);
  const onAcknowledgeRef = useRef<(() => void) | null>(null);
  const acknowledgeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showModalState || !focusAcknowledgeButton) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      acknowledgeButtonRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [focusAcknowledgeButton, showModalState]);

  const handleCancel = useCallback(() => {
    onAcknowledgeRef.current = null;
    setFocusAcknowledgeButton(false);
    setShowModalState(false);
  }, []);

  const handleAcknowledge = useCallback(() => {
    setIsAcknowledged(true);
    setFocusAcknowledgeButton(false);
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
          Dub is not responsible for legal or tax consequences resulting from
          misrepresentation.
        </p>
      </div>

      <div className="border-border-subtle flex items-center justify-end gap-2 border-t bg-neutral-50 px-5 py-4">
        <Button
          variant="secondary"
          className="h-8 w-fit px-3 focus-visible:border-neutral-500 focus-visible:ring-1 focus-visible:ring-neutral-500"
          text="Cancel"
          onClick={handleCancel}
        />
        <Button
          ref={acknowledgeButtonRef}
          variant="primary"
          className="h-8 w-fit px-3 focus-visible:border-neutral-500 focus-visible:ring-1 focus-visible:ring-neutral-500"
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
    (callback?: () => void, options?: { focusAcknowledgeButton?: boolean }) => {
      onAcknowledgeRef.current = callback ?? null;
      setFocusAcknowledgeButton(Boolean(options?.focusAcknowledgeButton));
      setShowModalState(true);
    },
    [],
  );

  return {
    modal,
    showModal,
    isOpen: showModalState,
    isAcknowledged,
    acknowledgeAndContinue,
  };
}
