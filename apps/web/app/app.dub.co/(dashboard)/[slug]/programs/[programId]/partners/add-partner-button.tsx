"use client";

import { Button, useKeyboardShortcut } from "@dub/ui";
import { useAddPartnerSheet } from "./add-partner-sheet";

export function AddPartnerButton() {
  const { addPartnerSheet, setIsOpen: setShowAddPartnerSheet } =
    useAddPartnerSheet();

  useKeyboardShortcut("p", () => setShowAddPartnerSheet(true));

  return (
    <>
      {addPartnerSheet}
      <Button
        type="button"
        onClick={() => setShowAddPartnerSheet(true)}
        text="Add partner"
        shortcut="P"
      />
    </>
  );
}
