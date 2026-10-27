"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button, useKeyboardShortcut, useMediaQuery } from "@dub/ui";
import { useBountySheet } from "./add-edit-bounty/add-edit-bounty-sheet";

export function CreateBountyButton() {
  const { isMobile } = useMediaQuery();
  const { role } = useWorkspace();
  const { BountySheet, setShowCreateBountySheet } = useBountySheet({
    nested: false,
  });

  const permissionsError = clientAccessCheck({
    action: "bounties.write",
    role,
    customPermissionDescription: "create bounties",
  }).error;

  useKeyboardShortcut("c", () => setShowCreateBountySheet(true), {
    enabled: !permissionsError,
  });

  return (
    <>
      {BountySheet}
      <Button
        type="button"
        onClick={() => setShowCreateBountySheet(true)}
        text={`Create${isMobile ? "" : " bounty"}`}
        shortcut="C"
        className="h-8 px-3 sm:h-9"
        disabledTooltip={permissionsError || undefined}
      />
    </>
  );
}
