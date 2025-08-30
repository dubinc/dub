"use client";

import { Button, useKeyboardShortcut } from "@dub/ui";
import { useBountySheet } from "./add-edit-bounty-sheet";

export function CreateBountyButton() {
  const { BountySheet, setShowCreateBountySheet } = useBountySheet({
    nested: false,
  });

  useKeyboardShortcut("c", () => setShowCreateBountySheet(true));

  return (
    <>
      {BountySheet}
      <Button
        type="button"
        onClick={() => setShowCreateBountySheet(true)}
        text="Create bounty"
        shortcut="C"
      />
    </>
  );
}
