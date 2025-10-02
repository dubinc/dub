"use client";

import { TrialExpiredModal } from "@/ui/modals/trial-expired-modal";
import { useCallback, useState } from "react";

export function useTrialExpiredModal() {
  const [showTrialExpiredModal, setShowTrialExpiredModal] =
    useState<boolean>(false);

  const TrialExpiredModalCallback = useCallback(() => {
    return showTrialExpiredModal ? (
      <TrialExpiredModal
        showModal={showTrialExpiredModal}
        setShowModal={setShowTrialExpiredModal}
      />
    ) : null;
  }, [showTrialExpiredModal]);

  return {
    setShowTrialExpiredModal,
    TrialExpiredModalCallback,
  };
}
