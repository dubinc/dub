"use client";

import { Button } from "@dub/ui";
import { Plus } from "@dub/ui/src/icons";
import { useInvitePartnerSheet } from "./invite-partner-sheet";

export function InvitePartnerButton() {
  const { invitePartnerSheet, setIsOpen: setShowInvitePartnerSheet } =
    useInvitePartnerSheet();

  return (
    <>
      {invitePartnerSheet}
      <Button
        type="button"
        variant="secondary"
        onClick={() => setShowInvitePartnerSheet(true)}
        text="Invite Partner"
        icon={<Plus className="size-4" />}
      />
    </>
  );
}
