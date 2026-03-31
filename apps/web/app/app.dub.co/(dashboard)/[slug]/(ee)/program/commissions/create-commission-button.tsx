"use client";

import { Button, useKeyboardShortcut, useMediaQuery } from "@dub/ui";
import { useCreateCommissionSheet } from "./create-commission-sheet";

export function CreateCommissionButton() {
  const { isMobile } = useMediaQuery();
  const { createCommissionSheet, setIsOpen: setShowCreateCommissionSheet } =
    useCreateCommissionSheet({
      nested: false,
    });

  useKeyboardShortcut("c", () => setShowCreateCommissionSheet(true));

  return (
    <>
      {createCommissionSheet}
      <Button
        type="button"
        onClick={() => setShowCreateCommissionSheet(true)}
        text={`Create${isMobile ? "" : " commission"}`}
        shortcut="C"
        className="h-8 px-3 sm:h-9"
      />
    </>
  );
}
