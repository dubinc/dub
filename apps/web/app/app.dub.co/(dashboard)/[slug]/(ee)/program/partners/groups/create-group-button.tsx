"use client";

import { Button, useKeyboardShortcut } from "@dub/ui";
import { useCreateGroupSheet } from "./create-group-sheet";

export function CreateGroupButton() {
  const { createGroupSheet, setIsOpen: setShowCreateGroupSheet } =
    useCreateGroupSheet({
      nested: false,
    });

  useKeyboardShortcut("c", () => setShowCreateGroupSheet(true));

  return (
    <>
      {createGroupSheet}
      <Button
        type="button"
        onClick={() => setShowCreateGroupSheet(true)}
        text="Create group"
        shortcut="C"
      />
    </>
  );
}
