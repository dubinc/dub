"use client";

import { Button, useKeyboardShortcut, useMediaQuery } from "@dub/ui";
import { useInvitePartnerSheet } from "./invite-partner-sheet";

export function InvitePartnerButton() {
  const { isMobile } = useMediaQuery();
  const { invitePartnerSheet, setIsOpen: setShowInvitePartnerSheet } =
    useInvitePartnerSheet();

  useKeyboardShortcut("p", () => setShowInvitePartnerSheet(true));

  return (
    <>
      {invitePartnerSheet}
      <Button
        type="button"
        onClick={() => setShowInvitePartnerSheet(true)}
        text={`Invite${isMobile ? "" : " partner"}`}
        shortcut="P"
        className="h-8 px-3 sm:h-9"
      />
    </>
  );
}
