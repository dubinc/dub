"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button } from "@dub/ui";
import { Sliders } from "@dub/ui/icons";
import { useEditLeadFormSheet } from "./edit-lead-form-sheet";

export function EditLeadFormButton() {
  const { role } = useWorkspace();
  const { editLeadFormSheet, setIsOpen } = useEditLeadFormSheet();

  const permissionsError = clientAccessCheck({
    action: "groups.write",
    role,
  }).error;

  return (
    <>
      {editLeadFormSheet}
      <Button
        type="button"
        variant="secondary"
        onClick={() => setIsOpen(true)}
        className="h-8 w-auto px-1.5 sm:h-9 sm:px-2.5"
        icon={<Sliders className="size-4 text-neutral-800" />}
        disabledTooltip={permissionsError || undefined}
        aria-label="Edit submitted lead form"
      />
    </>
  );
}
