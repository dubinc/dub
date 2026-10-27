"use client";

import { Button } from "@dub/ui";
import { useProgramPayoutSettingsSheet } from "./program-payout-settings-sheet";

export function ProgramPayoutSettingsButton() {
  const { programPayoutSettingsSheet, setIsOpen } =
    useProgramPayoutSettingsSheet();

  return (
    <>
      {programPayoutSettingsSheet}
      <Button
        type="button"
        text="Payout settings"
        variant="secondary"
        onClick={() => setIsOpen(true)}
        className="h-9 px-3"
      />
    </>
  );
}
