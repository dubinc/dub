"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button, useKeyboardShortcut, useMediaQuery } from "@dub/ui";
import { useCreateCommissionSheet } from "./create-commission-sheet";

export function CreateCommissionButton() {
  const { isMobile } = useMediaQuery();
  const { role } = useWorkspace();
  const { createCommissionSheet, setIsOpen: setShowCreateCommissionSheet } =
    useCreateCommissionSheet({
      nested: false,
    });

  const permissionsError = clientAccessCheck({
    action: "commissions.write",
    role,
    customPermissionDescription: "create commissions",
  }).error;

  useKeyboardShortcut("c", () => setShowCreateCommissionSheet(true), {
    enabled: !permissionsError,
  });

  return (
    <>
      {createCommissionSheet}
      <Button
        type="button"
        onClick={() => setShowCreateCommissionSheet(true)}
        text={`Create${isMobile ? "" : " commission"}`}
        shortcut="C"
        className="h-8 px-3 sm:h-9"
        disabledTooltip={permissionsError || undefined}
      />
    </>
  );
}
