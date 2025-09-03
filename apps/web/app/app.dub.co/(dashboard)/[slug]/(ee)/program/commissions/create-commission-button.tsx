"use client";

import { Button, useKeyboardShortcut } from "@dub/ui";
import { useCreateCommissionSheet } from "./create-commission-sheet";

export function CreateCommissionButton() {
  const { createCommissionSheet, setIsOpen: setShowCreateCommissionSheet } =
    useCreateCommissionSheet({
      nested: false,
      partnerId: "",
    });

  useKeyboardShortcut("c", () => setShowCreateCommissionSheet(true));

  return (
    <>
      {createCommissionSheet}
      <Button
        type="button"
        onClick={() => setShowCreateCommissionSheet(true)}
        text="Create commission"
        shortcut="C"
      />
    </>
  );
}
