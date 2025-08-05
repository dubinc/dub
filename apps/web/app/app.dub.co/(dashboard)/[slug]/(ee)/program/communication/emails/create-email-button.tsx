"use client";

import { Button, useKeyboardShortcut } from "@dub/ui";
import { toast } from "sonner";

export function CreateEmailButton() {
  useKeyboardShortcut("c", () => toast.info("WIP"));

  return (
    <>
      <Button
        type="button"
        onClick={() => toast.info("WIP")}
        text="Create email"
        shortcut="C"
      />
    </>
  );
}
