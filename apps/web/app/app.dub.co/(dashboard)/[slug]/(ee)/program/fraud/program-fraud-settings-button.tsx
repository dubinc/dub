"use client";

import { Button } from "@dub/ui";
import { useProgramFraudSettingsSheet } from "./program-fraud-settings-sheet";

export function ProgramFraudSettingsButton() {
  const { programFraudSettingsSheet, setIsOpen } =
    useProgramFraudSettingsSheet();

  return (
    <>
      {programFraudSettingsSheet}
      <Button
        type="button"
        text="Fraud settings"
        variant="secondary"
        onClick={() => setIsOpen(true)}
        className="h-9 px-3"
      />
    </>
  );
}
