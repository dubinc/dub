"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import useGroupsCount from "@/lib/swr/use-groups-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { usePartnersUpgradeModal } from "@/ui/partners/partners-upgrade-modal";
import { Button, useKeyboardShortcut, useMediaQuery } from "@dub/ui";
import { useCreateGroupModal } from "./create-group-modal";

export function CreateGroupButton() {
  const { isMobile } = useMediaQuery();
  const { groupsLimit, nextPlan, role } = useWorkspace();
  const { groupsCount } = useGroupsCount();

  const permissionsError = clientAccessCheck({
    action: "groups.write",
    role,
  }).error;

  const { partnersUpgradeModal, setShowPartnersUpgradeModal } =
    usePartnersUpgradeModal({
      plan: ["Advanced", "Enterprise"].includes(nextPlan.name)
        ? nextPlan.name
        : "Enterprise",
    });

  const { createGroupModal, setIsOpen: setShowCreateGroupSheet } =
    useCreateGroupModal({});

  const disabled = groupsCount === undefined || groupsLimit === undefined;

  const handleCreateGroup = () => {
    if (!disabled && groupsCount >= groupsLimit)
      setShowPartnersUpgradeModal(true);
    else setShowCreateGroupSheet(true);
  };

  useKeyboardShortcut("c", () => handleCreateGroup(), {
    enabled: !disabled && !permissionsError,
  });

  return (
    <>
      {partnersUpgradeModal}
      {createGroupModal}
      <Button
        type="button"
        onClick={handleCreateGroup}
        text={`Create${isMobile ? "" : " group"}`}
        className="h-8 px-3 sm:h-9"
        shortcut={!disabled ? "C" : undefined}
        disabled={disabled}
        disabledTooltip={permissionsError || undefined}
      />
    </>
  );
}
