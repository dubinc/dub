"use client";

import { Button, useKeyboardShortcut } from "@dub/ui";
import { useCreateGroupModal } from "./create-group-modal";

export function CreateGroupButton() {
  const { createGroupModal, setIsOpen: setShowCreateGroupSheet } =
    useCreateGroupModal({});

  useKeyboardShortcut("c", () => setShowCreateGroupSheet(true));

  return (
    <>
      {createGroupModal}
      <Button
        type="button"
        onClick={() => setShowCreateGroupSheet(true)}
        text="Create group"
        shortcut="C"
      />
    </>
  );
}
