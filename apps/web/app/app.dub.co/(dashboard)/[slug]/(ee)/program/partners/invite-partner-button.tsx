"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button, useKeyboardShortcut, useMediaQuery } from "@dub/ui";
import { useInvitePartnerSheet } from "./invite-partner-sheet";

export function InvitePartnerButton() {
  const { isMobile } = useMediaQuery();
  const { role } = useWorkspace();
  const { invitePartnerSheet, setIsOpen: setShowInvitePartnerSheet } =
    useInvitePartnerSheet();

  const permissionsError = clientAccessCheck({
    action: "partners.write",
    role,
    customPermissionDescription: "invite partners",
  }).error;

  useKeyboardShortcut("p", () => setShowInvitePartnerSheet(true), {
    enabled: !permissionsError,
  });

  return (
    <>
      {invitePartnerSheet}
      <Button
        type="button"
        onClick={() => setShowInvitePartnerSheet(true)}
        text={`Invite${isMobile ? "" : " partner"}`}
        shortcut="P"
        className="h-8 px-3 sm:h-9"
        disabledTooltip={permissionsError || undefined}
      />
    </>
  );
}
