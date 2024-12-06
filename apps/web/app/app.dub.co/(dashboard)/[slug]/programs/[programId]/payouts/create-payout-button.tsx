"use client";

import { useCreatePayoutSheet } from "@/ui/partners/create-payout-sheet";
import { Button, useKeyboardShortcut } from "@dub/ui";

export function CreatePayoutButton() {
  const { createPayoutSheet, setIsOpen: setShowCreatePayoutSheet } =
    useCreatePayoutSheet();

  useKeyboardShortcut("p", () => setShowCreatePayoutSheet(true));

  return (
    <>
      <Button
        type="button"
        onClick={() => setShowCreatePayoutSheet(true)}
        text="Create payout"
        shortcut="P"
      />
      {createPayoutSheet}
    </>
  );
}
