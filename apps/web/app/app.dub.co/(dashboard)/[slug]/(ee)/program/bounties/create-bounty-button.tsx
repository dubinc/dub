"use client";

import { Button, useKeyboardShortcut } from "@dub/ui";
import { useCreateBountySheet } from "./create-bounty-sheet";

export function CreateBountyButton() {
  const { createBountySheet, setIsOpen: setShowCreateBountySheet } =
    useCreateBountySheet({
      nested: false,
      partnerId: "",
    });

  useKeyboardShortcut("c", () => setShowCreateBountySheet(true));

  return (
    <>
      {createBountySheet}
      <Button
        type="button"
        onClick={() => setShowCreateBountySheet(true)}
        text="Create bounty"
        shortcut="C"
      />
    </>
  );
}
