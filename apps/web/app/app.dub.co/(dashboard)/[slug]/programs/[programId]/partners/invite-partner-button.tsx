"use client";

import { Button, useKeyboardShortcut } from "@dub/ui";
import { useInvitePartnerSheet } from "./invite-partner-sheet";

export function InvitePartnerButton() {
  const { invitePartnerSheet, setIsOpen: setShowInvitePartnerSheet } =
    useInvitePartnerSheet();

  useKeyboardShortcut("p", () => setShowInvitePartnerSheet(true));

  return (
    <>
      {invitePartnerSheet}
      <Button
        type="button"
        onClick={() => setShowInvitePartnerSheet(true)}
        text="Invite partner"
        shortcut="P"
      />
    </>
  );
}
