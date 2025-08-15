"use client";

import useGroupsCount from "@/lib/swr/use-groups-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { usePartnersUpgradeModal } from "@/ui/partners/partners-upgrade-modal";
import { Button, useKeyboardShortcut } from "@dub/ui";
import { useCreateGroupModal } from "./create-group-modal";

export function CreateGroupButton() {
  const { groupsLimit, nextPlan } = useWorkspace();
  const { groupsCount } = useGroupsCount();

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

  useKeyboardShortcut("c", () => handleCreateGroup());

  return (
    <>
      {partnersUpgradeModal}
      {createGroupModal}
      <Button
        type="button"
        onClick={handleCreateGroup}
        text="Create group"
        shortcut={!disabled ? "C" : undefined}
        disabled={disabled}
      />
    </>
  );
}
